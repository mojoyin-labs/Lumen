# Lumen

**Screen your PCOS risk from what you already know — and build the symptom history that gets you taken seriously.**

Lumen helps women notice patterns associated with PCOS (polycystic ovary syndrome) and prepare a clear summary to discuss with a doctor. It is a screening and self-advocacy tool — **not a diagnostic device.**

🔗 **Live app:** https://lumen-blond-alpha.vercel.app/
🏆 Built for the Hack-Nation 6th Global AI Hackathon · Challenge 05: Foundation Models for Women's Hormonal Health · **Application layer** (with a Model-layer contribution).

---

## The problem

PCOS affects roughly 1 in 10 women, yet up to 70% of cases go undiagnosed and diagnosis often takes years. The signal shows up as a *pattern* — irregular cycles, skin and hair changes, weight — spread across months, but each doctor's visit only captures a snapshot. So women get dismissed, repeatedly. The information exists; it's just never assembled in one place.

## What Lumen does

- **Risk screening from self-report alone.** A woman answers questions about things she already knows — cycle regularity, weight, skin, hair, lifestyle — and a trained model returns a screening signal with an **explainable breakdown** of which factors raised or lowered it.
- **Symptom logging (text + voice).** Entries are structured into an open schema and shown on a timeline, turning scattered days into a visible pattern.
- **Doctor summary (PDF).** A one-page summary of reported symptoms, cycle pattern, and screening signal to bring to an appointment.
- **Consent-gated open export.** With explicit opt-in, a de-identified copy is exported in an open schema format for research.

Every result is framed as a screening signal, never a diagnosis. PCOS names the *purpose* of the tool; it is never attached to a user's result.

## What makes it different

Most PCOS models rely on hormone panels and ultrasound — features a woman can't self-report, so they only work *after* she's already in the clinical system. Lumen's model uses **only self-reportable inputs** and still reaches **~87% accuracy** — a meaningful signal *before a single test*. It's also **explainable**, and it leaves behind reusable open infrastructure rather than being an isolated app.

---

## The model

Trained on the open **Kottarathil PCOS dataset** (Kaggle): 541 women across 10 hospitals in Kerala, India — a dataset used in peer-reviewed work (Nature *Scientific Reports*, 2025).

Two models were trained:

| Model | Features | Accuracy | Precision | Recall | AUC |
|---|---|---|---|---|---|
| Benchmark (all clinical features) | 41 | 0.917 | 0.966 | 0.778 | 0.955 |
| **Self-report (app)** | 13 | **0.872** | 0.844 | 0.750 | 0.886 |

The benchmark aligns with published results (~89–93%), confirming the pipeline is sound. The **self-report model** is what the app uses: logistic regression, chosen because it is explainable (per-feature contributions) and deploys as pure JavaScript with no ML runtime. See [`model/MODEL_CARD.md`](model/MODEL_CARD.md) for full metrics, intended use, and limitations.

**Honest limitation:** self-report recall is 0.75 — the screen misses about 1 in 4 true cases, so a lower-risk result never means "you're fine." The threshold is tuned to flag rather than miss, and every result defers to a clinician.

---

## Reusable, open-licensed assets

This is more than an app. The following are published for others to build on:

- **Symptom-log schema + controlled vocabulary** — [`schema/`](schema/) — a standard for making self-reported hormonal symptoms comparable across users.
- **Trained model + model card** — [`model/`](model/) — reproducible with a fixed seed.
- **Training pipeline** — [`model/train.py`](model/train.py) — run it to regenerate the metrics.
- **Dataset card** — [`schema/DATASET_CARD.md`](schema/DATASET_CARD.md) — consent, de-identification, and split guidance.

## Tech stack

React (Vite) · JavaScript · Python (scikit-learn) · OpenAI API + Whisper · Vercel. The risk math runs client-side in pure JS; OpenAI calls run through serverless functions with the key held server-side. Data persists locally in the browser — no account, no server-side personal data (privacy by minimization).

## Run locally

```bash
npm install
npm run dev          # risk screener works with no key
# for voice + structuring features:
vercel dev           # requires OPENAI_API_KEY in .env.local
```

Retrain the model:
```bash
cd model
pip install pandas scikit-learn openpyxl
python train.py
```

## Safety & scope

Lumen does not diagnose. PCOS diagnosis requires clinical evaluation (the Rotterdam criteria: bloodwork, ultrasound, clinical signs). Lumen produces a statistical screening signal from self-reported data to help a woman decide whether to seek assessment and to prepare for that conversation. Always discuss results with a qualified clinician.

## Data & citation

Dataset: Kottarathil, P. *Polycystic Ovary Syndrome (PCOS)*, Kaggle. Model and schema released under CC-BY-4.0; code under MIT.

## License

Code: MIT · Schema, model card, and derived metrics: CC-BY-4.0.
