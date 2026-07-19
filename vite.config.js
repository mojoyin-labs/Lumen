import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import process from 'node:process'
import { Buffer } from 'node:buffer'

// Dev-only plugin that mounts /api/structure locally
// so `npm run dev` works without Vercel CLI.
// In production on Vercel, the real api/structure.js serverless function takes over.
function localApiPlugin(env = {}) {
  return {
    name: 'local-api-structure',
    configureServer(server) {
      server.middlewares.use('/api/structure', async (req, res) => {
        if (req.method !== 'POST') {
          res.statusCode = 405;
          res.end(JSON.stringify({ error: 'Method not allowed' }));
          return;
        }

        // Parse JSON body
        let body = '';
        for await (const chunk of req) {
          body += chunk;
        }

        let parsed;
        try {
          parsed = JSON.parse(body);
        } catch {
          res.statusCode = 400;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ error: 'Invalid JSON body' }));
          return;
        }

        const { text } = parsed;
        if (!text || typeof text !== 'string' || text.trim().length === 0) {
          res.statusCode = 400;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ error: "Missing or empty 'text' field" }));
          return;
        }

        // Read API key from loaded env or process.env
        const apiKey = env.OPEN_API_KEY || process.env.OPEN_API_KEY;
        if (!apiKey) {
          res.statusCode = 500;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ error: 'Missing OPEN_API_KEY in .env.local' }));
          return;
        }

        const SYSTEM_PROMPT = `You convert a person's free-text description of how they feel into a single structured symptom-log entry. You are not a doctor and you never diagnose, interpret, or give medical advice. You only extract and structure what the person actually reported.

Rules:
- Output ONLY a JSON object. No prose, no markdown, no backticks.
- Map each reported symptom to exactly one code from this controlled vocabulary: fatigue, brain_fog, migraine, headache, mood_low, mood_irritable, anxiety, hot_flash, night_sweats, bloating, cramps, breast_tenderness, acne, hair_change, weight_change, libido_change, sleep_disturbance, nausea, dizziness, palpitations, joint_pain, digestive_change, cycle_irregular, spotting, other.
- Severity is an integer 0-3: 0 none, 1 mild, 2 moderate, 3 severe. If severity is not stated, infer conservatively from wording (e.g. "a bit tired" = 1, "exhausted" = 3). When unclear, use 1.
- Only include symptoms the person actually mentioned. Do not invent symptoms.
- Extract sleep_hours (number) and stress_level (0-3) only if stated or clearly implied; otherwise null.
- Extract cycle_day (integer) only if the person gives it; otherwise null.
- Put any useful short detail in the symptom's "note", but never include names, places, or identifying information in notes.
- Do not add fields beyond the schema.

Return this shape:
{
  "cycle_day": null,
  "sleep_hours": null,
  "stress_level": null,
  "symptoms": [
    { "code": "brain_fog", "severity": 2, "note": "foggy all morning" }
  ]
}`;

        try {
          const completion = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
              model: 'gpt-4o-mini',
              temperature: 0.1,
              response_format: { type: 'json_object' },
              messages: [
                { role: 'system', content: SYSTEM_PROMPT },
                { role: 'user', content: text.trim() }
              ]
            })
          });

          if (!completion.ok) {
            const errText = await completion.text();
            console.error('OpenAI error:', completion.status, errText);
            res.statusCode = 502;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ error: 'Upstream LLM request failed' }));
            return;
          }

          const data = await completion.json();
          const rawContent = data.choices?.[0]?.message?.content;

          let structured;
          try {
            structured = JSON.parse(rawContent);
          } catch {
            const cleaned = rawContent.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
            structured = JSON.parse(cleaned);
          }

          const entry = {
            entry_id: crypto.randomUUID(),
            logged_at: new Date().toISOString(),
            schema_version: '0.1.0',
            source_modality: 'text',
            cycle_day: structured.cycle_day ?? null,
            sleep_hours: structured.sleep_hours ?? null,
            stress_level: structured.stress_level ?? null,
            symptoms: Array.isArray(structured.symptoms) ? structured.symptoms : [],
            _raw_text: text.trim()
          };

          res.statusCode = 200;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify(entry));

        } catch (err) {
          console.error('Local API error:', err);
          res.statusCode = 500;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ error: 'Failed to process entry' }));
        }
      });
    }
  };
}

// Dev-only plugin that mounts /api/transcribe locally
// so `npm run dev` works without Vercel CLI.
function localTranscribePlugin(env = {}) {
  return {
    name: 'local-api-transcribe',
    configureServer(server) {
      server.middlewares.use('/api/transcribe', async (req, res) => {
        if (req.method !== 'POST') {
          res.statusCode = 405;
          res.end(JSON.stringify({ error: 'Method not allowed' }));
          return;
        }

        const apiKey = env.OPEN_API_KEY || process.env.OPEN_API_KEY;
        if (!apiKey) {
          res.statusCode = 500;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ error: 'Missing OPEN_API_KEY in .env.local' }));
          return;
        }

        try {
          // Collect raw body
          const chunks = [];
          for await (const chunk of req) {
            chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
          }
          const body = Buffer.concat(chunks);

          // Extract boundary from content-type
          const contentType = req.headers['content-type'] || '';
          const boundaryMatch = contentType.match(/boundary=(.+)/);
          if (!boundaryMatch) {
            res.statusCode = 400;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ error: 'No multipart boundary' }));
            return;
          }

          const boundary = boundaryMatch[1];
          const boundaryBuffer = Buffer.from(`--${boundary}`);

          // Find file part
          const parts = [];
          let start = 0;
          while (true) {
            const idx = body.indexOf(boundaryBuffer, start);
            if (idx === -1) break;
            if (start > 0) parts.push(body.slice(start, idx));
            start = idx + boundaryBuffer.length;
          }

          let audioFile = null;
          for (const part of parts) {
            const headerEnd = part.indexOf('\r\n\r\n');
            if (headerEnd === -1) continue;
            const headerSection = part.slice(0, headerEnd).toString('utf-8');
            const fileData = part.slice(headerEnd + 4, part.length - 2);
            const filenameMatch = headerSection.match(/filename="([^"]+)"/);
            const ctMatch = headerSection.match(/Content-Type:\s*(.+)/i);
            if (filenameMatch) {
              audioFile = {
                filename: filenameMatch[1],
                contentType: ctMatch ? ctMatch[1].trim() : 'application/octet-stream',
                data: fileData,
              };
              break;
            }
          }

          if (!audioFile) {
            res.statusCode = 400;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ error: 'No audio file in request' }));
            return;
          }

          // Build multipart for OpenAI Whisper
          const formBoundary = '----WhisperBoundary' + Date.now();
          const formParts = [];
          formParts.push(
            `--${formBoundary}\r\nContent-Disposition: form-data; name="model"\r\n\r\nwhisper-1\r\n`
          );
          formParts.push(
            `--${formBoundary}\r\nContent-Disposition: form-data; name="language"\r\n\r\nen\r\n`
          );
          const fileHeader =
            `--${formBoundary}\r\n` +
            `Content-Disposition: form-data; name="file"; filename="${audioFile.filename}"\r\n` +
            `Content-Type: ${audioFile.contentType}\r\n\r\n`;
          const fileFooter = `\r\n--${formBoundary}--\r\n`;

          const bodyBuffer = Buffer.concat([
            Buffer.from(formParts.join('')),
            Buffer.from(fileHeader),
            audioFile.data,
            Buffer.from(fileFooter),
          ]);

          const whisperRes = await fetch('https://api.openai.com/v1/audio/transcriptions', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${apiKey}`,
              'Content-Type': `multipart/form-data; boundary=${formBoundary}`,
            },
            body: bodyBuffer,
          });

          if (!whisperRes.ok) {
            const errText = await whisperRes.text();
            console.error('Whisper API error:', whisperRes.status, errText);
            res.statusCode = 502;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ error: 'Upstream transcription failed' }));
            return;
          }

          const result = await whisperRes.json();
          res.statusCode = 200;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ text: result.text || '' }));

        } catch (err) {
          console.error('Local transcribe error:', err);
          res.statusCode = 500;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ error: 'Transcription failed' }));
        }
      });
    }
  };
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  return {
    plugins: [react(), localApiPlugin(env), localTranscribePlugin(env)],
    // Load OPEN_API_KEY from .env.local as a server-only env var
    envPrefix: ['VITE_', 'OPEN_'],
  }
})
