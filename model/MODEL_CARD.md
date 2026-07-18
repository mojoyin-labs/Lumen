# Model Card — Lumen PCOS Risk-Screening Model

**Version:** 0.1.0 · **License:** MIT (code) · CC-BY-4.0 (metrics/derived data)
**Built for:** Hack-Nation 6th Global AI Hackathon, Challenge 05.

## Intended use

Produces a **risk-screening signal** from self-reported information, to help a person decide whether to seek clinical assessment for PCOS and to bring a structured history to that appointment. It flags patterns; it does not diagnose.

## Explicitly NOT for

- Diagnosis. PCOS diagnosis requires clinical evaluation (Rotterdam criteria: bloodwork + ultrasound + clinical signs). This model replaces none of that.
- Treatment decisions of any kind.
- Use as the sole basis for any health action.

## Data

Open **Kottarathil PCOS dataset** (Kaggle): 541 women of reproductive age, collected across 10 hospitals in Kerala, India. 541 records, ~41 usable features, target `PCOS (Y/N)`. Class balance: roughly 1 PCOS-positive for every 2 negatives.

## Two models

**A — Benchmark (all 41 features).** Random Forest. Includes hormone panels and ultrasound. This is the reusable Model-layer asset for researchers; it is NOT used by the app.

**B — Self-report (13 features).** Uses only what a woman can report without labs or ultrasound: age, weight, height, BMI, cycle regularity, cycle length, and yes/no on weight gain, hair growth, skin darkening, hair loss, pimples, fast food, regular exercise. Logistic Regression was selected for the app because it is **explainable** (per-feature contribution) and deploys as pure JavaScript.

## Held-out performance (20% stratified test split; 5-fold CV also reported)

| Model | Features | Accuracy | Precision | Recall | F1 | AUC | CV acc |
|---|---|---|---|---|---|---|---|
| Benchmark RF | 41 | 0.917 | 0.966 | 0.778 | 0.862 | 0.955 | 0.87 ± 0.05 |
| Self-report LR (app) | 13 | 0.872 | 0.844 | 0.750 | 0.794 | 0.886 | 0.84 ± 0.08 |
| Self-report RF | 13 | 0.853 | 0.813 | 0.722 | 0.765 | 0.887 | 0.82 ± 0.07 |
| Self-report GB | 13 | 0.807 | 0.727 | 0.667 | 0.696 | 0.891 | 0.77 ± 0.08 |

The benchmark aligns with published results on this dataset (~89–93% accuracy). The headline finding: **a self-report-only model reaches ~87% accuracy / 0.89 AUC** — a meaningful risk signal from information a woman already has, before a single test.

## Limitations (read before trusting)

- **Recall 0.75** — the app model misses about 1 in 4 true positives on the test set. That is why the risk threshold is set low (favor flagging over missing) and why every "lower risk" result still advises clinical follow-up if symptoms persist. A screen that says "lower risk" does not rule PCOS out.
- **Single region.** Data is from one population in Kerala; it may not generalize to other populations. Treat scores as indicative, not authoritative.
- **Label provenance.** The dataset's PCOS labels come from the source clinics; criteria may vary.
- **Class imbalance** was not resampled; metrics are reported on the natural distribution.

## Framing rules baked into use

Output is always phrased as "a higher/moderate/lower risk pattern worth discussing with a clinician," paired with "this is a screening signal, not a diagnosis." The condition is never named as a conclusion.

## Reproduce

`python train.py` on the dataset produces `metrics.json` and `model_self_report_lr.json`. All splits use `random_state=42`.
