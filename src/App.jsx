import { useState, useMemo } from "react";
import { 
  Activity, 
  Scale,  
  Calendar, 
  Dumbbell, 
  Copy, 
  Check, 
  Info, 
  User,
  HeartPulse,
  Sparkles,
  ShieldAlert,
  ClipboardList,
  Flame,
  Plus,
  ChevronDown,
  Settings,
  HelpCircle
} from "lucide-react";
import { scoreRisk } from "./model/riskModel";

// Import sample data directly for the mock recent logs list
const SEED_LOGS = [
  { day: "CD 24", time: "May 2", symptoms: "Sleep disruption (moderate), Brain fog (moderate), Irritability", avatar: "P1" },
  { day: "CD 25", time: "May 3", symptoms: "Bloating (moderate), Breast tenderness, Fatigue (moderate)", avatar: "P2" },
  { day: "CD 28", time: "May 6", symptoms: "Migraine (severe with aura), Low mood (moderate), Cramps", avatar: "P3" },
  { day: "CD 6",  time: "May 12", symptoms: "Fatigue (mild) - feeling much better", avatar: "P4" }
];

const FEATURE_LABELS = {
  "Age (yrs)": { label: "Age", unit: "yrs", desc: "Your age in years" },
  "Weight (Kg)": { label: "Weight", unit: "kg", desc: "Body weight" },
  "Height(Cm)": { label: "Height", unit: "cm", desc: "Body height" },
  "BMI": { label: "Body Mass Index (BMI)", unit: "", desc: "Metabolic indicator" },
  "Cycle(R/I)": { label: "Cycle Regularity", unit: "", desc: "Menstrual flow pattern" },
  "Cycle length(days)": { label: "Period Duration", unit: "days", desc: "Days of period bleeding" },
  "Weight gain(Y/N)": { label: "Weight Gain", unit: "", desc: "Recent unexplained weight gain" },
  "hair growth(Y/N)": { label: "Excess Hair Growth", unit: "", desc: "Excess hair on face/chest" },
  "Skin darkening (Y/N)": { label: "Skin Darkening", unit: "", desc: "Darkened skin around neck/folds" },
  "Hair loss(Y/N)": { label: "Hair Loss / Thinning", unit: "", desc: "Hair thinning on scalp" },
  "Pimples(Y/N)": { label: "Acne / Pimples", unit: "", desc: "Frequent skin breakouts" },
  "Fast food (Y/N)": { label: "Frequent Fast Food", unit: "", desc: "Eating fast food regularly" },
  "Reg.Exercise(Y/N)": { label: "Regular Exercise", unit: "", desc: "Exercising at least 3x/week" }
};

export default function App() {
  // Form/Dashboard State
  const [formData, setFormData] = useState({
    age: 28,
    weight: 62,
    height: 160,
    cycleRegularity: 2, // 2 = Regular, 4 = Irregular
    periodLength: 5,    // bleeding duration
    weightGain: 0,      // 0 = No, 1 = Yes
    hairGrowth: 0,
    skinDarkening: 0,
    hairLoss: 0,
    pimples: 0,
    fastFood: 0,
    exercise: 1        // 1 = Yes, 0 = No
  });

  const [copied, setCopied] = useState(false);

  // Automatically calculate BMI
  const calculatedBMI = useMemo(() => {
    const heightInMeters = formData.height / 100;
    if (heightInMeters <= 0) return 0;
    const bmi = formData.weight / (heightInMeters * heightInMeters);
    return Number(bmi.toFixed(1));
  }, [formData.weight, formData.height]);

  // Determine BMI category
  const bmiCategory = useMemo(() => {
    if (calculatedBMI < 18.5) return { label: "Underweight", class: "underweight" };
    if (calculatedBMI < 25) return { label: "Normal", class: "normal" };
    if (calculatedBMI < 30) return { label: "Overweight", class: "overweight" };
    return { label: "Obese", class: "obese" };
  }, [calculatedBMI]);

  // Map state to model keys
  const modelInputs = useMemo(() => {
    return {
      "Age (yrs)": formData.age,
      "Weight (Kg)": formData.weight,
      "Height(Cm)": formData.height,
      "BMI": calculatedBMI,
      "Cycle(R/I)": formData.cycleRegularity,
      "Cycle length(days)": formData.periodLength,
      "Weight gain(Y/N)": formData.weightGain,
      "hair growth(Y/N)": formData.hairGrowth,
      "Skin darkening (Y/N)": formData.skinDarkening,
      "Hair loss(Y/N)": formData.hairLoss,
      "Pimples(Y/N)": formData.pimples,
      "Fast food (Y/N)": formData.fastFood,
      "Reg.Exercise(Y/N)": formData.exercise
    };
  }, [formData, calculatedBMI]);

  // Run scoring logic
  const riskResult = useMemo(() => {
    return scoreRisk(modelInputs);
  }, [modelInputs]);

  // Copy-paste synthesis block
  const doctorSummaryText = useMemo(() => {
    const riskPercentage = Math.round(riskResult.risk * 100);
    const dateStr = new Date().toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
    
    return `Lumen PCOS Risk-Screening Discussion Guide
Date generated: ${dateStr}
Screening Pattern: ${riskResult.band.toUpperCase()} RISK PATTERN (Score: ${riskPercentage}%)

--- Self-Reported Metrics ---
- Age: ${formData.age} yrs
- Weight: ${formData.weight} kg | Height: ${formData.height} cm (BMI: ${calculatedBMI} - ${bmiCategory.label})
- Menstrual Cycle: ${formData.cycleRegularity === 2 ? "Regular" : "Irregular"}
- Bleeding Duration: ${formData.periodLength} days
- Recent Weight Gain: ${formData.weightGain === 1 ? "Yes" : "No"}
- Excess Hair Growth (Face/Body): ${formData.hairGrowth === 1 ? "Yes" : "No"}
- Skin Darkening (Patches): ${formData.skinDarkening === 1 ? "Yes" : "No"}
- Hair Loss / Thinning: ${formData.hairLoss === 1 ? "Yes" : "No"}
- Pimples / Acne: ${formData.pimples === 1 ? "Yes" : "No"}
- Frequent Fast Food: ${formData.fastFood === 1 ? "Yes" : "No"}
- Regular Exercise: ${formData.exercise === 1 ? "Yes" : "No"}

--- Key Screening Signal Factors ---
${riskResult.drivers.slice(0, 3).map((d, index) => {
  const cleanName = FEATURE_LABELS[d.feature]?.label || d.feature;
  return `${index + 1}. ${cleanName} (${d.direction === "raises" ? "Raises screening signal" : "Lowers screening signal"})`;
}).join("\n")}

--- Medical Disclaimer ---
This is a mathematical screening signal based on statistical correlations from self-reported data. It is NOT a medical diagnosis, clinical assessment, or treatment recommendation. Always consult a physician for official medical evaluation.`;
  }, [formData, calculatedBMI, bmiCategory, riskResult]);

  const copyToClipboard = () => {
    navigator.clipboard.writeText(doctorSummaryText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleInputChange = (field, val) => {
    setFormData(prev => ({
      ...prev,
      [field]: val
    }));
  };

  return (
    <div className="dashboard-frame">
      
      {/* 1. Left Sidebar Navigation */}
      <aside className="sidebar-panel">
        <div className="sidebar-avatar-wrapper">
          <div className="profile-avatar">GU</div>
        </div>
        
        <nav className="nav-menu">
          <div className="nav-item active">
            <HeartPulse className="nav-item-icon" />
            <span className="tooltip-box">Risk Screening</span>
          </div>
          <div className="nav-item">
            <ClipboardList className="nav-item-icon" />
            <span className="tooltip-box">Symptom Log</span>
          </div>
          <a href="file:///e:/Dev/Lumen/model/MODEL_CARD.md" className="nav-item">
            <Sparkles className="nav-item-icon" />
            <span className="tooltip-box">Model Details</span>
          </a>
          <a href="file:///e:/Dev/Lumen/schema/DATASET_CARD.md" className="nav-item">
            <Info className="nav-item-icon" />
            <span className="tooltip-box">Schema Guide</span>
          </a>
        </nav>

        <div className="sidebar-bottom">
          <div className="nav-item">
            <Settings className="nav-item-icon" />
            <span className="tooltip-box">Settings</span>
          </div>
          <div className="nav-item">
            <HelpCircle className="nav-item-icon" />
            <span className="tooltip-box">Help Support</span>
          </div>
        </div>
      </aside>

      {/* 2. Central Workspace Area */}
      <main className="main-content-panel">
        
        {/* Top Header */}
        <header className="content-header">
          <div className="header-title-area">
            <h1 className="header-title">Hormonal Health Dashboard</h1>
            <span className="header-subtitle">Self-reported screening signal & health overview</span>
          </div>
          <div className="header-meta-area">
            <div className="date-badge">
              <Calendar style={{ width: 14, height: 14 }} />
              <span>{new Date().toLocaleDateString(undefined, { year: 'numeric', month: '2-digit', day: '2-digit' })}</span>
            </div>
            <div className="profile-card">
              <div className="profile-avatar">GU</div>
              <div className="profile-info">
                <span className="profile-name">Guest Profile</span>
                <span className="profile-role">Self-Tracking</span>
              </div>
              <ChevronDown style={{ width: 12, height: 12, color: "var(--text-muted)", marginLeft: 4 }} />
            </div>
          </div>
        </header>

        {/* Hello Banner Card */}
        <div className="welcome-banner">
          <div className="welcome-text">
            <h2>Hello, Guest</h2>
            <p>Lumen helps you screen self-reported health markers against statistical patterns worth discussing with a doctor.</p>
          </div>
          <button className="welcome-badge-btn" onClick={copyToClipboard}>
            <Plus style={{ width: 14, height: 14 }} />
            <span>Export Report</span>
          </button>
        </div>

        {/* Top Overview Cards row */}
        <section className="metrics-row">
          
          {/* Card 1: BMI */}
          <div className="metric-card">
            <div className="metric-header">
              <span className="metric-title">Body Mass Index</span>
              <div className="metric-icon-box" style={{ backgroundColor: "var(--blue-light)" }}>
                <Scale style={{ width: 16, height: 16, color: "var(--blue-primary)" }} />
              </div>
            </div>
            <div className="metric-value-box">
              <span className="metric-value">{calculatedBMI}</span>
            </div>
            <span className={`metric-sub bmi-category ${bmiCategory.class}`} style={{ border: "none", padding: 0 }}>
              {bmiCategory.label} range
            </span>
          </div>

          {/* Card 2: Bleeding days */}
          <div className="metric-card">
            <div className="metric-header">
              <span className="metric-title">Period Length</span>
              <div className="metric-icon-box" style={{ backgroundColor: "var(--teal-light)" }}>
                <Calendar style={{ width: 16, height: 16, color: "var(--teal-primary)" }} />
              </div>
            </div>
            <div className="metric-value-box">
              <span className="metric-value">{formData.periodLength} days</span>
            </div>
            <span className="metric-sub" style={{ color: "var(--teal-text)" }}>
              Bleeding duration
            </span>
          </div>

          {/* Card 3: Cycle Regularity */}
          <div className="metric-card">
            <div className="metric-header">
              <span className="metric-title">Cycle Rhythm</span>
              <div className="metric-icon-box" style={{ backgroundColor: "var(--violet-light)" }}>
                <Activity style={{ width: 16, height: 16, color: "var(--violet-primary)" }} />
              </div>
            </div>
            <div className="metric-value-box">
              <span className="metric-value">{formData.cycleRegularity === 2 ? "Regular" : "Irregular"}</span>
            </div>
            <span className="metric-sub" style={{ color: formData.cycleRegularity === 2 ? "var(--emerald-text)" : "var(--rose-text)" }}>
              {formData.cycleRegularity === 2 ? "Stable interval" : "Fluctuating rhythm"}
            </span>
          </div>

          {/* Card 4: Model Risk Result */}
          <div className={`metric-card ${riskResult.band}`}>
            <div className="metric-header">
              <span className="metric-title">Screening Signal</span>
              <div className="metric-icon-box" style={{ 
                backgroundColor: riskResult.band === "lower" ? "var(--emerald-light)" : 
                                 riskResult.band === "moderate" ? "var(--amber-light)" : "var(--rose-light)" 
              }}>
                <HeartPulse style={{ 
                  width: 16, 
                  height: 16, 
                  color: riskResult.band === "lower" ? "var(--emerald-primary)" : 
                         riskResult.band === "moderate" ? "var(--amber-primary)" : "var(--rose-primary)" 
                }} />
              </div>
            </div>
            <div className="metric-value-box">
              <span className="metric-value">{Math.round(riskResult.risk * 100)}%</span>
            </div>
            <span className="metric-sub" style={{ 
              color: riskResult.band === "lower" ? "var(--emerald-text)" : 
                     riskResult.band === "moderate" ? "var(--amber-text)" : "var(--rose-text)" 
            }}>
              {riskResult.band.toUpperCase()} RISK PATTERN
            </span>
          </div>
        </section>

        {/* Central Workspace — full-width panel */}
        <section>
          {/* Your Health Details & Screening Signal Factors */}
          <div className="panel-card">
            <div className="panel-header">
              <div className="panel-title-wrapper">
                <User className="panel-icon" />
                <span className="panel-title">Your Health Details</span>
              </div>
            </div>
            
            <div className="console-grid">
              {/* Age slider */}
              <div className="console-field">
                <div className="console-label-row">
                  <label htmlFor="age-select" className="console-label">Your Age</label>
                  <span className="console-badge">{formData.age} yrs</span>
                </div>
                <input 
                  id="age-select"
                  type="range" 
                  min="15" 
                  max="60" 
                  value={formData.age} 
                  onChange={(e) => handleInputChange("age", Number(e.target.value))}
                  className="slider-input"
                />
              </div>

              {/* Weight slider */}
              <div className="console-field">
                <div className="console-label-row">
                  <label htmlFor="weight-select" className="console-label">Your Weight</label>
                  <span className="console-badge">{formData.weight} kg</span>
                </div>
                <input 
                  id="weight-select"
                  type="range" 
                  min="30" 
                  max="150" 
                  value={formData.weight} 
                  onChange={(e) => handleInputChange("weight", Number(e.target.value))}
                  className="slider-input"
                />
              </div>

              {/* Height slider */}
              <div className="console-field">
                <div className="console-label-row">
                  <label htmlFor="height-select" className="console-label">Your Height</label>
                  <span className="console-badge">{formData.height} cm</span>
                </div>
                <input 
                  id="height-select"
                  type="range" 
                  min="120" 
                  max="220" 
                  value={formData.height} 
                  onChange={(e) => handleInputChange("height", Number(e.target.value))}
                  className="slider-input"
                />
              </div>

              {/* Cycle Length bleeding duration slider */}
              <div className="console-field">
                <div className="console-label-row">
                  <label htmlFor="cycle-length-select" className="console-label">Period Bleeding Duration</label>
                  <span className="console-badge">{formData.periodLength} days</span>
                </div>
                <input 
                  id="cycle-length-select"
                  type="range" 
                  min="1" 
                  max="14" 
                  value={formData.periodLength} 
                  onChange={(e) => handleInputChange("periodLength", Number(e.target.value))}
                  className="slider-input"
                />
              </div>
            </div>

            {/* Model Weight Drivers Chart */}
            <div className="drivers-chart-section" style={{ marginTop: "12px" }}>
              <div className="panel-header" style={{ border: "none", padding: "0 0 10px 0", marginBottom: "8px" }}>
                <span className="panel-title" style={{ fontSize: "14px" }}>Screening Signal Factors</span>
              </div>
              
              <div className="drivers-chart-list">
                {riskResult.drivers.map((driver) => {
                  const labelInfo = FEATURE_LABELS[driver.feature];
                  if (!labelInfo) return null;
                  
                  // Calculate absolute percentage width for visualization
                  const maxCoef = 0.624622; // highest absolute coefficient in model
                  const absoluteContribution = Math.abs(driver.contribution);
                  const percentageWidth = Math.min(100, Math.round((absoluteContribution / maxCoef) * 100));
                  
                  const isRaises = driver.direction === "raises";
                  
                  return (
                    <div key={driver.feature} className="driver-chart-row">
                      <div className="driver-chart-header">
                        <span>{labelInfo.label}</span>
                        <span style={{ color: isRaises ? "var(--rose-text)" : "var(--emerald-text)" }}>
                          {isRaises ? "raises screening signal" : "lowers screening signal"}
                        </span>
                      </div>
                      <div className="driver-chart-bar-bg">
                        <div 
                          className={`driver-chart-bar-fill ${driver.direction}`} 
                          style={{ width: `${percentageWidth}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </section>

        {/* Claim notice banner inside center content */}
        <div className="disclaimer-banner" style={{ borderLeft: "4px solid var(--blue-primary)", background: "var(--blue-light)", color: "var(--text-main)" }}>
          <ShieldAlert className="disclaimer-icon" style={{ color: "var(--blue-primary)" }} />
          <div className="disclaimer-text">
            <strong>Screening Notice:</strong> This tool renders statistical screening signals based on self-reported data and correlation analyses. It is not a diagnosis and does not replace ultrasound scans, hormone panels, or clinical evaluation. Always discuss results with your healthcare provider.
          </div>
        </div>
      </main>

      {/* 3. Right Sidebar Panel */}
      <aside className="right-sidebar-panel">
        
        {/* Symptom Check switches */}
        <div className="sidebar-section">
          <span className="sidebar-section-title">Active Symptoms</span>
          
          <div className="symptom-trigger-list">
            
            {/* Cycle regularity */}
            <div className={`symptom-trigger-item ${formData.cycleRegularity === 4 ? "active" : ""}`}>
              <div className="symptom-trigger-left">
                <Activity className="symptom-trigger-icon" />
                <span className="symptom-trigger-name">Irregular Flow Cycle</span>
              </div>
              <label className="switch-widget">
                <input 
                  type="checkbox" 
                  checked={formData.cycleRegularity === 4}
                  onChange={() => handleInputChange("cycleRegularity", formData.cycleRegularity === 2 ? 4 : 2)}
                />
                <span className="switch-slider"></span>
              </label>
            </div>

            {/* Weight gain */}
            <div className={`symptom-trigger-item ${formData.weightGain === 1 ? "active" : ""}`}>
              <div className="symptom-trigger-left">
                <Scale className="symptom-trigger-icon" />
                <span className="symptom-trigger-name">Recent Weight Gain</span>
              </div>
              <label className="switch-widget">
                <input 
                  type="checkbox" 
                  checked={formData.weightGain === 1}
                  onChange={() => handleInputChange("weightGain", formData.weightGain === 1 ? 0 : 1)}
                />
                <span className="switch-slider"></span>
              </label>
            </div>

            {/* Hair growth */}
            <div className={`symptom-trigger-item ${formData.hairGrowth === 1 ? "active" : ""}`}>
              <div className="symptom-trigger-left">
                <Sparkles className="symptom-trigger-icon" />
                <span className="symptom-trigger-name">Excess Body/Facial Hair</span>
              </div>
              <label className="switch-widget">
                <input 
                  type="checkbox" 
                  checked={formData.hairGrowth === 1}
                  onChange={() => handleInputChange("hairGrowth", formData.hairGrowth === 1 ? 0 : 1)}
                />
                <span className="switch-slider"></span>
              </label>
            </div>

            {/* Skin darkening */}
            <div className={`symptom-trigger-item ${formData.skinDarkening === 1 ? "active" : ""}`}>
              <div className="symptom-trigger-left">
                <User className="symptom-trigger-icon" />
                <span className="symptom-trigger-name">Skin Darkening Folds</span>
              </div>
              <label className="switch-widget">
                <input 
                  type="checkbox" 
                  checked={formData.skinDarkening === 1}
                  onChange={() => handleInputChange("skinDarkening", formData.skinDarkening === 1 ? 0 : 1)}
                />
                <span className="switch-slider"></span>
              </label>
            </div>

            {/* Hair loss */}
            <div className={`symptom-trigger-item ${formData.hairLoss === 1 ? "active" : ""}`}>
              <div className="symptom-trigger-left">
                <Info className="symptom-trigger-icon" />
                <span className="symptom-trigger-name">Scalp Hair Loss</span>
              </div>
              <label className="switch-widget">
                <input 
                  type="checkbox" 
                  checked={formData.hairLoss === 1}
                  onChange={() => handleInputChange("hairLoss", formData.hairLoss === 1 ? 0 : 1)}
                />
                <span className="switch-slider"></span>
              </label>
            </div>

            {/* Pimples */}
            <div className={`symptom-trigger-item ${formData.pimples === 1 ? "active" : ""}`}>
              <div className="symptom-trigger-left">
                <Sparkles className="symptom-trigger-icon" />
                <span className="symptom-trigger-name">Persistent Acne</span>
              </div>
              <label className="switch-widget">
                <input 
                  type="checkbox" 
                  checked={formData.pimples === 1}
                  onChange={() => handleInputChange("pimples", formData.pimples === 1 ? 0 : 1)}
                />
                <span className="switch-slider"></span>
              </label>
            </div>

            {/* Fast food */}
            <div className={`symptom-trigger-item ${formData.fastFood === 1 ? "active" : ""}`}>
              <div className="symptom-trigger-left">
                <Flame className="symptom-trigger-icon" />
                <span className="symptom-trigger-name">Frequent Fast Food</span>
              </div>
              <label className="switch-widget">
                <input 
                  type="checkbox" 
                  checked={formData.fastFood === 1}
                  onChange={() => handleInputChange("fastFood", formData.fastFood === 1 ? 0 : 1)}
                />
                <span className="switch-slider"></span>
              </label>
            </div>

            {/* Exercise */}
            <div className={`symptom-trigger-item ${formData.exercise === 1 ? "active" : ""}`}>
              <div className="symptom-trigger-left">
                <Dumbbell className="symptom-trigger-icon" />
                <span className="symptom-trigger-name">Regular Exercise</span>
              </div>
              <label className="switch-widget">
                <input 
                  type="checkbox" 
                  checked={formData.exercise === 1}
                  onChange={() => handleInputChange("exercise", formData.exercise === 1 ? 0 : 1)}
                />
                <span className="switch-slider"></span>
              </label>
            </div>

          </div>
        </div>

        {/* Recent logs thread */}
        <div className="sidebar-section">
          <span className="sidebar-section-title">Recent Logs</span>
          <div className="logs-list">
            {SEED_LOGS.map((log) => (
              <div key={log.day} className="log-item-card">
                <div className="log-item-avatar">{log.avatar}</div>
                <div className="log-item-body">
                  <div className="log-item-header">
                    <span className="log-item-author">{log.day}</span>
                    <span className="log-item-time">{log.time}</span>
                  </div>
                  <span className="log-item-desc">{log.symptoms}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Exporter Guide */}
        <div className="sidebar-section">
          <span className="sidebar-section-title">Discussion Guide</span>
          
          <div className="export-guide-card">
            <div className="export-guide-header">
              <span className="export-guide-title">
                <ClipboardList style={{ width: 14, height: 14, color: "var(--violet-primary)" }} />
                <span>Discussion Report</span>
              </span>
              
              <button 
                onClick={copyToClipboard} 
                className={`export-btn ${copied ? "success" : ""}`}
              >
                {copied ? <Check style={{ width: 12, height: 12 }} /> : <Copy style={{ width: 12, height: 12 }} />}
                <span>{copied ? "Copied" : "Copy"}</span>
              </button>
            </div>
            
            <pre className="export-guide-preview">
              {doctorSummaryText}
            </pre>
          </div>
        </div>

      </aside>

    </div>
  );
}