# HerLog

**An open standard for hormonal-health symptom logging — and a reference app that produces it.**

Hack-Nation 6th Global AI Hackathon · Challenge 05: Foundation Models for Women's Hormonal Health · Application layer.

## The problem

Hormones shift continuously, but a doctor's appointment captures a single snapshot. Patterns get lost between visits. And across users, symptom data is recorded in a thousand incompatible ways, so none of it compounds into research.

## What HerLog contributes

The deliverable is **not the app**. It is an open, reusable building block:

- **A versioned schema** (`schema/hormonal-symptom-log.schema.json`) for a symptom-log entry.
- **A controlled vocabulary** (`schema/controlled-vocabulary.json`) so free-text reports become comparable.
- **A dataset card** (`schema/DATASET_CARD.md`) with consent, de-identification, and split guidance.

The app is the **instrument** that generates schema-conformant data. An LLM maps a person's own words onto the controlled vocabulary; the schema is the contract that makes the output comparable across everyone who uses it. That mapping is the reusable infrastructure — a direct answer to the brief's "no shared benchmark / fragmented infrastructure" gap.

## What the app does

1. Log how you feel, in your own words (text now; voice and lab-photo on the roadmap).
2. The entry is structured to the open schema and added to a timeline.
3. Generate a plain-language summary of your patterns to bring to a clinician.
4. Optionally consent to export a de-identified copy into the open dataset format.

## What it is not

Not a diagnostic tool. It makes no medical claims. It helps you track and prepare to talk to a clinician.

## Stack

- Frontend: React (single page).
- Model calls: OpenAI API via a serverless function (key held server-side).
  - `prompts/structure-entry.md` — free text → schema JSON.
  - `prompts/doctor-summary.md` — structured history → clinician-ready summary.
- Multimodal roadmap: Whisper for voice, gpt-image-2 for lab-result photos.

## License

Schema and dataset: CC-BY-4.0. Code: MIT. Built to be extended after the hackathon.
