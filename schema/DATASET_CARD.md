# Dataset Card — HerLog Hormonal Symptom Log

**Version:** 0.1.0
**License:** CC-BY-4.0 (schema and dataset) · code MIT
**Status:** Reference / seed dataset produced during the Hack-Nation 6th Global AI Hackathon (Challenge 05).

## What this is

An open, versioned standard for self-reported hormonal-health symptom logging, plus a small seed dataset conforming to it. The goal is a **reusable building block**: a controlled vocabulary and schema that lets scattered, natural-language symptom reports become comparable, research-ready records across users and studies.

It directly targets two gaps named in the challenge brief: the absence of a shared benchmark and fragmented, non-comparable data.

## What this is NOT

This is not a diagnostic tool and makes no medical or diagnostic claims. Entries are self-reported. The intended use is longitudinal self-tracking and preparing a structured summary to discuss with a qualified clinician, plus research on self-reported symptom patterns.

## Schema

- `hormonal-symptom-log.schema.json` — JSON Schema (draft-07) for a single entry.
- `controlled-vocabulary.json` — canonical symptom codes, labels, synonyms, and the 0–3 severity scale.

Each entry pairs structured fields (cycle day, sleep, stress, life stage) with an array of symptoms, each mapped to a controlled-vocabulary `code` and a `severity`. A free-text-to-schema mapper (LLM) converts a user's own words into this format; the schema is the contract that makes outputs comparable.

## Collection & consent

- Entries originate as free text, voice, or a photographed lab result, entered by the participant.
- `participant_id` is an opaque, locally generated pseudonym. It is never derived from name, email, phone, or device identifiers.
- Only entries with `consented_for_research: true` are eligible for the open dataset.
- Free-text `note` fields are scrubbed of names, places, and identifiers before export.

## De-identification rules (v0.1)

1. No direct identifiers are ever stored in the schema.
2. `logged_at` may be date-shifted per participant by a fixed random offset to preserve intervals while obscuring absolute dates.
3. Free-text notes are stripped or redacted before export; export tooling drops any note it cannot confidently clean.
4. Rare combinations that could re-identify a participant should be reviewed before public release.

## Suggested splits (for future benchmark use)

Split **by participant, not by entry**, to prevent leakage of a person's pattern across splits:

- train: 70% of participants
- validation: 15% of participants
- test: 15% of participants

## Example prediction tasks this enables

- Predict next-entry symptom severity from recent history.
- Cluster entries into recurring symptom patterns over a cycle.
- Map free text to the controlled vocabulary (the mapping task itself is a benchmarkable problem).

## How to extend

Add new symptom codes to `controlled-vocabulary.json` and the schema `enum` together, bump the version, and document the change. Never rename or repurpose an existing code — downstream datasets depend on stable meaning.

## Citation

If you build on this, cite: "HerLog Hormonal Symptom Log Schema v0.1.0, Hack-Nation 6th Global AI Hackathon, 2026."
