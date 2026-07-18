"""
Lumen — PCOS risk-screening model training pipeline.

Trains TWO models on the open Kottarathil PCOS dataset (541 women, Kerala):
  A) Benchmark model — all clinical + biochemical + ultrasound features.
     This is the reusable Model-layer asset. Validates against published work.
  B) Self-report model — ONLY features a woman can report without labs/ultrasound.
     This is what the app actually uses. Honest, deployable, explainable.

Outputs: metrics (JSON), a model card, and a JS-ready export of model B
so the app can score risk in pure JavaScript with no Python runtime.

Frames output as a RISK SCREEN, never a diagnosis.
"""
import json
import numpy as np
import pandas as pd
from sklearn.model_selection import train_test_split, cross_val_score
from sklearn.preprocessing import StandardScaler
from sklearn.linear_model import LogisticRegression
from sklearn.ensemble import RandomForestClassifier, GradientBoostingClassifier
from sklearn.pipeline import Pipeline
from sklearn.metrics import (accuracy_score, precision_score, recall_score,
                             f1_score, roc_auc_score, confusion_matrix)

RANDOM_STATE = 42

# ---------- Load & clean ----------
df = pd.read_excel('PCOS_Raw.xlsx', sheet_name='Full_new')
df.columns = [c.strip() for c in df.columns]  # trim whitespace in headers
df = df.drop(columns=[c for c in df.columns if c.startswith('Unnamed')], errors='ignore')
df = df.drop(columns=['Sl. No', 'Patient File No.'], errors='ignore')

TARGET = 'PCOS (Y/N)'

# Coerce everything to numeric; the dataset has a few stray string cells.
for c in df.columns:
    df[c] = pd.to_numeric(df[c], errors='coerce')

# Drop rows with no label, impute the rest with column medians.
df = df.dropna(subset=[TARGET])
y = df[TARGET].astype(int)
X_all = df.drop(columns=[TARGET])
X_all = X_all.fillna(X_all.median())

# ---------- Feature sets ----------
# Self-reportable: what a person genuinely knows about herself. No labs, no
# ultrasound, no clinical vitals she wouldn't have measured.
SELF_REPORT = [
    'Age (yrs)', 'Weight (Kg)', 'Height(Cm)', 'BMI',
    'Cycle(R/I)', 'Cycle length(days)',
    'Weight gain(Y/N)', 'hair growth(Y/N)', 'Skin darkening (Y/N)',
    'Hair loss(Y/N)', 'Pimples(Y/N)', 'Fast food (Y/N)', 'Reg.Exercise(Y/N)',
]
SELF_REPORT = [c for c in SELF_REPORT if c in X_all.columns]

def evaluate(model, X, y, name):
    Xtr, Xte, ytr, yte = train_test_split(
        X, y, test_size=0.2, stratify=y, random_state=RANDOM_STATE)
    model.fit(Xtr, ytr)
    pred = model.predict(Xte)
    proba = model.predict_proba(Xte)[:, 1]
    cv = cross_val_score(model, X, y, cv=5, scoring='accuracy')
    m = {
        'model': name,
        'n_features': X.shape[1],
        'test_accuracy': round(float(accuracy_score(yte, pred)), 4),
        'precision': round(float(precision_score(yte, pred)), 4),
        'recall': round(float(recall_score(yte, pred)), 4),
        'f1': round(float(f1_score(yte, pred)), 4),
        'roc_auc': round(float(roc_auc_score(yte, proba)), 4),
        'cv5_accuracy_mean': round(float(cv.mean()), 4),
        'cv5_accuracy_std': round(float(cv.std()), 4),
        'confusion_matrix': confusion_matrix(yte, pred).tolist(),
    }
    return m, model

results = {}

# ---------- Model A: benchmark, all features ----------
rf_all = Pipeline([('scaler', StandardScaler()),
                   ('clf', RandomForestClassifier(n_estimators=300, random_state=RANDOM_STATE))])
results['benchmark_all_features'], _ = evaluate(rf_all, X_all, y, 'RandomForest (all features)')

# ---------- Model B: self-report subset ----------
Xsr = X_all[SELF_REPORT]

# B1: Random Forest (best accuracy on subset)
rf_sr = Pipeline([('scaler', StandardScaler()),
                  ('clf', RandomForestClassifier(n_estimators=300, random_state=RANDOM_STATE))])
results['self_report_random_forest'], _ = evaluate(rf_sr, Xsr, y, 'RandomForest (self-report)')

# B2: Gradient Boosting (self-report)
gb_sr = Pipeline([('scaler', StandardScaler()),
                  ('clf', GradientBoostingClassifier(random_state=RANDOM_STATE))])
results['self_report_gradient_boosting'], _ = evaluate(gb_sr, Xsr, y, 'GradientBoosting (self-report)')

# B3: Logistic Regression (self-report) — chosen for the app: explainable + JS-exportable
lr_sr = Pipeline([('scaler', StandardScaler()),
                  ('clf', LogisticRegression(max_iter=1000, random_state=RANDOM_STATE))])
metrics_lr, fitted_lr = evaluate(lr_sr, Xsr, y, 'LogisticRegression (self-report)')
results['self_report_logistic_regression'] = metrics_lr

# ---------- Export LR for pure-JS scoring ----------
# Fit on ALL data for the deployed export (metrics above already report held-out perf).
lr_full = Pipeline([('scaler', StandardScaler()),
                    ('clf', LogisticRegression(max_iter=1000, random_state=RANDOM_STATE))])
lr_full.fit(Xsr, y)
scaler = lr_full.named_steps['scaler']
clf = lr_full.named_steps['clf']

export = {
    'model': 'logistic_regression_self_report',
    'note': 'Risk-screening signal, NOT a diagnosis. Trained on the open Kottarathil PCOS dataset.',
    'features': SELF_REPORT,
    'mean': [round(float(v), 6) for v in scaler.mean_],
    'scale': [round(float(v), 6) for v in scaler.scale_],
    'coef': [round(float(v), 6) for v in clf.coef_[0]],
    'intercept': round(float(clf.intercept_[0]), 6),
    'positive_class': 'PCOS (Y)',
    'dataset': 'Kottarathil PCOS dataset (Kaggle), 541 women, 10 hospitals, Kerala, India',
}
with open('model_self_report_lr.json', 'w') as f:
    json.dump(export, f, indent=2)

with open('metrics.json', 'w') as f:
    json.dump(results, f, indent=2)

# ---------- Console report ----------
for k, m in results.items():
    print(f"\n[{k}]  ({m['n_features']} features)")
    print(f"  accuracy={m['test_accuracy']}  precision={m['precision']}  "
          f"recall={m['recall']}  f1={m['f1']}  auc={m['roc_auc']}")
    print(f"  5-fold cv acc = {m['cv5_accuracy_mean']} ± {m['cv5_accuracy_std']}")
    print(f"  confusion (rows=true, cols=pred): {m['confusion_matrix']}")

print("\nSelf-report features used by the app:", SELF_REPORT)
print("Exported -> model_self_report_lr.json, metrics.json")
