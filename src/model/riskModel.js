// Lumen — PCOS risk-screening scorer (pure JS, no runtime needed).
// This produces a RISK SIGNAL to discuss with a clinician. It is NOT a diagnosis.
// Model: logistic regression trained on the open Kottarathil PCOS dataset (541 women).
// Held-out performance: accuracy 0.87, AUC 0.89, recall 0.75 (see MODEL_CARD.md).

export const MODEL = {
  features: [
    "Age (yrs)", "Weight (Kg)", "Height(Cm)", "BMI",
    "Cycle(R/I)", "Cycle length(days)",
    "Weight gain(Y/N)", "hair growth(Y/N)", "Skin darkening (Y/N)",
    "Hair loss(Y/N)", "Pimples(Y/N)", "Fast food (Y/N)", "Reg.Exercise(Y/N)"
  ],
  // Paste mean/scale/coef/intercept from model_self_report_lr.json here.
  mean: [31.430684, 59.637153, 156.484835, 24.311285, 2.560074, 4.94085, 0.377079, 0.273567, 0.306839, 0.452865, 0.489834, 0.515712, 0.247689],
  scale: [5.406002, 11.01809, 6.027966, 4.052648, 0.901116, 1.490641, 0.484655, 0.44579, 0.461182, 0.497773, 0.499897, 0.499753, 0.43167],
  coef: [-0.367174, 0.095796, 0.01084, -0.183401, 0.566446, -0.222411, 0.576917, 0.624622, 0.601039, -0.071273, 0.423162, 0.341075, 0.140518],
  intercept: -1.151619,
};

// Encoding help for the app's form:
//   Cycle(R/I): regular = 2, irregular = 4  (dataset encoding)
//   All (Y/N) fields: No = 0, Yes = 1
// Feed inputs as an object keyed by the exact feature names above.

function sigmoid(z) { return 1 / (1 + Math.exp(-z)); }

// Returns { risk: 0..1, band: 'lower'|'moderate'|'higher', drivers: [{feature, contribution, direction}] }
export function scoreRisk(inputs, model = MODEL) {
  const { features, mean, scale, coef, intercept } = model;
  let z = intercept;
  const drivers = [];
  features.forEach((f, i) => {
    const std = (Number(inputs[f]) - mean[i]) / scale[i];
    const contribution = std * coef[i];
    z += contribution;
    drivers.push({
      feature: f,
      contribution: Number(contribution.toFixed(3)),
      direction: contribution > 0 ? "raises" : "lowers",
    });
  });
  const risk = sigmoid(z);
  // Screening tool: threshold set to favor sensitivity (flag rather than miss).
  const band = risk >= 0.5 ? "higher" : risk >= 0.25 ? "moderate" : "lower";
  drivers.sort((a, b) => Math.abs(b.contribution) - Math.abs(a.contribution));
  return { risk: Number(risk.toFixed(3)), band, drivers: drivers.slice(0, 5) };
}

// IMPORTANT copy rules for whatever UI consumes this:
//  - Never say "you have PCOS" or name the condition as a conclusion.
//  - Say: "Your answers show a HIGHER/MODERATE/LOWER risk pattern worth
//    discussing with a clinician." Always pair with "not a diagnosis."
