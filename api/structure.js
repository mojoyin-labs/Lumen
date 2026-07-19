/* global process */
// Vercel Serverless Function: POST /api/structure
// Converts free-text symptom descriptions into structured JSON
// using the structure-entry prompt and OpenAI chat completion.

const SYSTEM_PROMPT = `You convert a person's free-text description of how they feel into a single structured symptom-log entry. You are not a doctor and you never diagnose, interpret, or give medical advice. You only extract and structure what the person actually reported.

Rules:
- Output ONLY a JSON object. No prose, no markdown, no backticks.
- Map each reported symptom to exactly one code from this controlled vocabulary: fatigue, brain_fog, migraine, headache, mood_low, mood_irritable, anxiety, hot_flash, night_sweats, bloating, cramps, breast_tenderness, acne, hair_change, weight_change, libido_change, sleep_disturbance, nausea, dizziness, palpitations, joint_pain, digestive_change, cycle_irregular, spotting, other.
- Severity is an integer 0–3: 0 none, 1 mild, 2 moderate, 3 severe. If severity is not stated, infer conservatively from wording (e.g. "a bit tired" = 1, "exhausted" = 3). When unclear, use 1.
- Only include symptoms the person actually mentioned. Do not invent symptoms.
- Extract sleep_hours (number) and stress_level (0–3) only if stated or clearly implied; otherwise null.
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

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { text } = req.body || {};

  if (!text || typeof text !== "string" || text.trim().length === 0) {
    return res.status(400).json({ error: "Missing or empty 'text' field" });
  }

  const apiKey = process.env.OPEN_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: "Server misconfigured: missing API key" });
  }

  try {
    const completion = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        temperature: 0.1,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: text.trim() }
        ]
      })
    });

    if (!completion.ok) {
      const errBody = await completion.text();
      console.error("OpenAI API error:", completion.status, errBody);
      return res.status(502).json({ error: "Upstream LLM request failed" });
    }

    const data = await completion.json();
    const rawContent = data.choices?.[0]?.message?.content;

    if (!rawContent) {
      return res.status(502).json({ error: "No content in LLM response" });
    }

    // Parse the structured output
    let structured;
    try {
      structured = JSON.parse(rawContent);
    } catch {
      // Retry once — sometimes the model wraps in backticks despite instructions
      const cleaned = rawContent.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
      structured = JSON.parse(cleaned);
    }

    // Stamp with full schema envelope fields
    const entry = {
      entry_id: crypto.randomUUID(),
      logged_at: new Date().toISOString(),
      schema_version: "0.1.0",
      source_modality: "text",
      cycle_day: structured.cycle_day ?? null,
      sleep_hours: structured.sleep_hours ?? null,
      stress_level: structured.stress_level ?? null,
      symptoms: Array.isArray(structured.symptoms) ? structured.symptoms : [],
      _raw_text: text.trim()
    };

    return res.status(200).json(entry);

  } catch (err) {
    console.error("structure handler error:", err);
    return res.status(500).json({ error: "Failed to process entry" });
  }
}
