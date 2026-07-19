/* global process, Buffer */
// Vercel Serverless Function: POST /api/transcribe
// Accepts audio via multipart/form-data, sends it to OpenAI Whisper,
// and returns the transcription text.

export const config = {
  api: {
    bodyParser: false, // We need the raw body for multipart parsing
  },
};

/**
 * Minimal multipart/form-data parser.
 * Extracts the first file part from the request body.
 */
async function parseMultipart(req) {
  const contentType = req.headers["content-type"] || "";
  const boundaryMatch = contentType.match(/boundary=(.+)/);
  if (!boundaryMatch) throw new Error("No multipart boundary found");

  const boundary = boundaryMatch[1];

  // Collect raw body as Buffer
  const chunks = [];
  for await (const chunk of req) {
    chunks.push(typeof chunk === "string" ? Buffer.from(chunk) : chunk);
  }
  const body = Buffer.concat(chunks);

  // Split on boundary
  const boundaryBuffer = Buffer.from(`--${boundary}`);
  const parts = [];
  let start = 0;

  while (true) {
    const idx = body.indexOf(boundaryBuffer, start);
    if (idx === -1) break;
    if (start > 0) {
      parts.push(body.slice(start, idx));
    }
    start = idx + boundaryBuffer.length;
  }

  // Parse the first file part
  for (const part of parts) {
    const headerEnd = part.indexOf("\r\n\r\n");
    if (headerEnd === -1) continue;

    const headerSection = part.slice(0, headerEnd).toString("utf-8");
    const fileData = part.slice(headerEnd + 4, part.length - 2); // strip trailing \r\n

    const nameMatch = headerSection.match(/name="([^"]+)"/);
    const filenameMatch = headerSection.match(/filename="([^"]+)"/);
    const ctMatch = headerSection.match(/Content-Type:\s*(.+)/i);

    if (filenameMatch) {
      return {
        fieldName: nameMatch ? nameMatch[1] : "file",
        filename: filenameMatch[1],
        contentType: ctMatch ? ctMatch[1].trim() : "application/octet-stream",
        data: fileData,
      };
    }
  }

  throw new Error("No file part found in multipart body");
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const apiKey = process.env.OPEN_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: "Server misconfigured: missing API key" });
  }

  try {
    const file = await parseMultipart(req);

    // Build multipart/form-data for OpenAI Whisper API
    const formBoundary = "----WhisperBoundary" + Date.now();
    const formParts = [];

    // model field
    formParts.push(
      `--${formBoundary}\r\n` +
      `Content-Disposition: form-data; name="model"\r\n\r\n` +
      `whisper-1\r\n`
    );

    // language hint (optional, improves accuracy)
    formParts.push(
      `--${formBoundary}\r\n` +
      `Content-Disposition: form-data; name="language"\r\n\r\n` +
      `en\r\n`
    );

    // file field header
    const fileHeader =
      `--${formBoundary}\r\n` +
      `Content-Disposition: form-data; name="file"; filename="${file.filename}"\r\n` +
      `Content-Type: ${file.contentType}\r\n\r\n`;

    const fileFooter = `\r\n--${formBoundary}--\r\n`;

    // Combine into a single Buffer
    const bodyBuffer = Buffer.concat([
      Buffer.from(formParts.join("")),
      Buffer.from(fileHeader),
      file.data,
      Buffer.from(fileFooter),
    ]);

    const whisperRes = await fetch("https://api.openai.com/v1/audio/transcriptions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": `multipart/form-data; boundary=${formBoundary}`,
      },
      body: bodyBuffer,
    });

    if (!whisperRes.ok) {
      const errText = await whisperRes.text();
      console.error("Whisper API error:", whisperRes.status, errText);
      return res.status(502).json({ error: "Upstream transcription failed" });
    }

    const result = await whisperRes.json();

    return res.status(200).json({ text: result.text || "" });

  } catch (err) {
    console.error("transcribe handler error:", err);
    return res.status(500).json({ error: err.message || "Transcription failed" });
  }
}
