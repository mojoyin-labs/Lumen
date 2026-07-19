import { useState, useEffect, useMemo, useCallback, useRef } from "react";
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
  ChevronDown,
  Settings,
  HelpCircle,
  Loader,
  Send,
  Clock,
  Moon,
  Zap,
  AlertCircle,
  ChevronRight,
  Mic,
  MicOff,
  Download,
  X,
  Database,
  FileText

} from "lucide-react";
import { scoreRisk } from "./model/riskModel";

// Controlled vocabulary labels for rendering symptom pills
const SYMPTOM_LABELS = {
  fatigue: "Fatigue", brain_fog: "Brain fog", migraine: "Migraine",
  headache: "Headache", mood_low: "Low mood", mood_irritable: "Irritability",
  anxiety: "Anxiety", hot_flash: "Hot flash", night_sweats: "Night sweats",
  bloating: "Bloating", cramps: "Cramps", breast_tenderness: "Breast tenderness",
  acne: "Acne", hair_change: "Hair changes", weight_change: "Weight change",
  libido_change: "Libido change", sleep_disturbance: "Sleep disturbance",
  nausea: "Nausea", dizziness: "Dizziness", palpitations: "Palpitations",
  joint_pain: "Joint pain", digestive_change: "Digestive change",
  cycle_irregular: "Irregular cycle", spotting: "Spotting", other: "Other"
};

const SEVERITY_LABELS = ["none", "mild", "moderate", "severe"];
const SEVERITY_CLASSES = ["sev-0", "sev-1", "sev-2", "sev-3"];

// Smooth number interpolation hook for deliberate, animated percentage transitions
function useAnimatedNumber(targetValue, duration = 400) {
  const [displayValue, setDisplayValue] = useState(targetValue);
  const startValueRef = useRef(targetValue);
  const startTimeRef = useRef(null);
  const animationFrameRef = useRef(null);

  useEffect(() => {
    startValueRef.current = displayValue;
    startTimeRef.current = performance.now();

    const animate = (now) => {
      const elapsed = now - startTimeRef.current;
      const progress = Math.min(elapsed / duration, 1);
      const easeProgress = 1 - Math.pow(1 - progress, 3);
      const current = Math.round(startValueRef.current + (targetValue - startValueRef.current) * easeProgress);
      setDisplayValue(current);

      if (progress < 1) {
        animationFrameRef.current = requestAnimationFrame(animate);
      }
    };

    animationFrameRef.current = requestAnimationFrame(animate);
    return () => {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    };
  }, [targetValue, duration]);

  return displayValue;
}

// Relative time formatter
function timeAgo(isoString) {
  const seconds = Math.floor((Date.now() - new Date(isoString).getTime()) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

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

  // Symptom logging state
  const [symptomText, setSymptomText] = useState("");
  const [logEntries, setLogEntries] = useState([]);
  const [isLogging, setIsLogging] = useState(false);
  const [logError, setLogError] = useState(null);
  const [expandedEntry, setExpandedEntry] = useState(null);

  // Export modal state
  const [showExportModal, setShowExportModal] = useState(false);
  const [researchConsent, setResearchConsent] = useState(false);

  // Slide-over drawer state
  const [activeDrawer, setActiveDrawer] = useState(null); // 'model' | 'schema' | 'settings' | 'help' | null
  const symptomLogRef = useRef(null);
  const mainWorkspaceRef = useRef(null);

  // Voice recording state
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const recordingTimerRef = useRef(null);

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

  // Smooth animated percentage counter
  const targetPercentage = Math.round(riskResult.risk * 100);
  const animatedPercentage = useAnimatedNumber(targetPercentage, 450);

  // Transient flash state when score changes
  const [isUpdatingSignal, setIsUpdatingSignal] = useState(false);
  const prevPercentageRef = useRef(targetPercentage);

  useEffect(() => {
    if (prevPercentageRef.current !== targetPercentage) {
      prevPercentageRef.current = targetPercentage;
      setIsUpdatingSignal(true);
      const timer = setTimeout(() => setIsUpdatingSignal(false), 500);
      return () => clearTimeout(timer);
    }
  }, [targetPercentage]);

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

  // Generate clean PDF summary for doctor visit via browser print dialog
  const downloadPDF = useCallback(() => {
    const dateStr = new Date().toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      window.print();
      return;
    }

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Lumen Doctor Summary - ${dateStr}</title>
          <style>
            @media print {
              body { padding: 0; }
            }
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; padding: 40px; color: #1e293b; max-width: 800px; margin: 0 auto; line-height: 1.6; }
            .header { border-bottom: 2px solid #e2e8f0; padding-bottom: 16px; margin-bottom: 24px; }
            h1 { color: #4f46e5; margin: 0 0 6px 0; font-size: 24px; font-weight: 700; }
            .meta { color: #64748b; font-size: 14px; }
            .badge { display: inline-block; padding: 6px 14px; background: #fee2e2; color: #991b1b; font-weight: 600; border-radius: 9999px; font-size: 13px; margin: 16px 0 24px 0; }
            .section { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px; margin-bottom: 20px; }
            .section-title { font-weight: 700; color: #0f172a; margin-bottom: 12px; text-transform: uppercase; font-size: 12px; letter-spacing: 0.05em; border-bottom: 1px solid #cbd5e1; padding-bottom: 6px; }
            ul { margin: 0; padding-left: 20px; }
            li { margin-bottom: 8px; }
            .disclaimer { font-size: 12px; color: #64748b; border-top: 1px dashed #cbd5e1; padding-top: 16px; margin-top: 32px; background: #fff8f6; border: 1px solid #fecdd3; border-radius: 6px; padding: 12px 16px; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>Lumen PCOS Risk-Screening Discussion Guide</h1>
            <div class="meta">Generated on ${dateStr} for Clinical Discussion</div>
          </div>

          <div class="badge">${riskResult.band.toUpperCase()} RISK PATTERN (${Math.round(riskResult.risk * 100)}%)</div>

          <div class="section">
            <div class="section-title">Self-Reported Metrics</div>
            <ul>
              <li><strong>Age:</strong> ${formData.age} yrs</li>
              <li><strong>Weight &amp; Height:</strong> ${formData.weight} kg | ${formData.height} cm (BMI: ${calculatedBMI} — ${bmiCategory.label})</li>
              <li><strong>Menstrual Cycle:</strong> ${formData.cycleRegularity === 2 ? "Regular" : "Irregular"} (${formData.periodLength} days bleeding)</li>
              <li><strong>Recent Weight Gain:</strong> ${formData.weightGain === 1 ? "Yes" : "No"}</li>
              <li><strong>Excess Hair Growth:</strong> ${formData.hairGrowth === 1 ? "Yes" : "No"}</li>
              <li><strong>Skin Darkening:</strong> ${formData.skinDarkening === 1 ? "Yes" : "No"}</li>
              <li><strong>Hair Loss / Thinning:</strong> ${formData.hairLoss === 1 ? "Yes" : "No"}</li>
              <li><strong>Acne / Pimples:</strong> ${formData.pimples === 1 ? "Yes" : "No"}</li>
              <li><strong>Frequent Fast Food:</strong> ${formData.fastFood === 1 ? "Yes" : "No"}</li>
              <li><strong>Regular Exercise:</strong> ${formData.exercise === 1 ? "Yes" : "No"}</li>
            </ul>
          </div>

          <div class="section">
            <div class="section-title">Key Screening Signal Factors</div>
            <ul>
              ${riskResult.drivers.slice(0, 5).map(d => {
                const cleanName = FEATURE_LABELS[d.feature]?.label || d.feature;
                return `<li><strong>${cleanName}:</strong> ${d.direction === "raises" ? "Raises screening signal" : "Lowers screening signal"}</li>`;
              }).join('')}
            </ul>
          </div>

          <div class="disclaimer">
            <strong>Medical Disclaimer:</strong> This document is a mathematical screening signal based on statistical correlations from self-reported data. It is NOT a medical diagnosis, clinical assessment, or treatment recommendation. Always consult a qualified physician for official medical evaluation.
          </div>

          <script>
            window.onload = function() {
              window.print();
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  }, [formData, calculatedBMI, bmiCategory, riskResult]);

  // Sidebar navigation handler
  const handleNavClick = useCallback((target) => {
    if (target === 'screening') {
      setActiveDrawer(null);
      if (mainWorkspaceRef.current) {
        mainWorkspaceRef.current.scrollTo({ top: 0, behavior: 'smooth' });
      }
    } else if (target === 'symptom_log') {
      setActiveDrawer(null);
      if (symptomLogRef.current) {
        symptomLogRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
        const textarea = symptomLogRef.current.querySelector('textarea');
        if (textarea) textarea.focus();
      }
    } else {
      setActiveDrawer(prev => prev === target ? null : target);
    }
  }, []);

  // --- Export / Download Logic ---

  // Strip likely PII (names, places, emails, phone numbers) from free-text
  const scrubPII = useCallback((text) => {
    if (!text) return text;
    let scrubbed = text;
    // Strip email addresses
    scrubbed = scrubbed.replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, '[REDACTED]');
    // Strip phone-like patterns (7+ digits with optional separators)
    scrubbed = scrubbed.replace(/(\+?\d[\d\s\-().]{6,}\d)/g, '[REDACTED]');
    // Strip words that look like proper nouns mid-sentence (capitalized words not at sentence start)
    // Only strip sequences of 2+ capitalized words together (likely a name/place)
    scrubbed = scrubbed.replace(/(?<=[.!?]\s+|,\s+|;\s+|—\s+|–\s+|\s)([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)/g, '[REDACTED]');
    return scrubbed;
  }, []);

  // Build the de-identified JSON export object
  const buildExportPayload = useCallback((consented) => {
    const payload = {
      schema_version: "0.1.0",
      exported_at: new Date().toISOString(),
      consented_for_research: consented,
      risk_screening: {
        age_yrs: formData.age,
        weight_kg: formData.weight,
        height_cm: formData.height,
        bmi: calculatedBMI,
        cycle_regularity: formData.cycleRegularity === 2 ? "regular" : "irregular",
        period_length_days: formData.periodLength,
        weight_gain: formData.weightGain === 1,
        hair_growth: formData.hairGrowth === 1,
        skin_darkening: formData.skinDarkening === 1,
        hair_loss: formData.hairLoss === 1,
        pimples: formData.pimples === 1,
        fast_food: formData.fastFood === 1,
        regular_exercise: formData.exercise === 1,
        screening_signal: {
          risk_score: Number((riskResult.risk).toFixed(4)),
          band: riskResult.band,
          top_drivers: riskResult.drivers.slice(0, 5).map(d => ({
            feature: FEATURE_LABELS[d.feature]?.label || d.feature,
            direction: d.direction,
          })),
        },
      },
      symptom_entries: logEntries.map(entry => {
        const cleaned = {
          entry_id: entry.entry_id,
          logged_at: entry.logged_at,
          schema_version: "0.1.0",
          symptoms: entry.symptoms.map(s => ({
            code: s.code,
            severity: s.severity,
            note: consented ? scrubPII(s.note) : (s.note || null),
          })),
          source_modality: entry.source_modality || "text",
          consented_for_research: consented,
        };
        if (entry.cycle_day != null) cleaned.cycle_day = entry.cycle_day;
        if (entry.sleep_hours != null) cleaned.sleep_hours = entry.sleep_hours;
        if (entry.stress_level != null) cleaned.stress_level = entry.stress_level;
        if (entry.life_stage) cleaned.life_stage = entry.life_stage;
        // For research exports, scrub the raw text too
        if (consented && entry._raw_text) {
          cleaned._raw_text = scrubPII(entry._raw_text);
        } else if (entry._raw_text) {
          cleaned._raw_text = entry._raw_text;
        }
        return cleaned;
      }),
    };
    return payload;
  }, [formData, calculatedBMI, riskResult, logEntries, scrubPII]);

  // Trigger browser file download
  const downloadExport = useCallback((consented) => {
    const payload = buildExportPayload(consented);
    const jsonStr = JSON.stringify(payload, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'lumen-export.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setShowExportModal(false);
    setResearchConsent(false);
  }, [buildExportPayload]);

  // Submit symptom log to API
  const submitSymptomLog = useCallback(async () => {
    if (!symptomText.trim() || isLogging) return;
    
    setIsLogging(true);
    setLogError(null);
    
    try {
      const response = await fetch("/api/structure", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: symptomText.trim() })
      });
      
      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.error || `Request failed (${response.status})`);
      }
      
      const entry = await response.json();
      setLogEntries(prev => [entry, ...prev]);
      setSymptomText("");
    } catch (err) {
      setLogError(err.message);
    } finally {
      setIsLogging(false);
    }
  }, [symptomText, isLogging]);

  // Voice recording handlers
  const startRecording = useCallback(async () => {
    setLogError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
          ? 'audio/webm;codecs=opus'
          : 'audio/webm'
      });
      audioChunksRef.current = [];
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = async () => {
        // Stop all tracks to release mic
        stream.getTracks().forEach(t => t.stop());
        clearInterval(recordingTimerRef.current);
        setRecordingDuration(0);

        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        audioChunksRef.current = [];

        if (audioBlob.size < 1000) {
          setLogError('Recording too short — try holding the mic button longer');
          return;
        }

        // Transcribe
        setIsTranscribing(true);
        try {
          const formData = new FormData();
          formData.append('file', audioBlob, 'recording.webm');

          const res = await fetch('/api/transcribe', {
            method: 'POST',
            body: formData,
          });

          if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            throw new Error(err.error || `Transcription failed (${res.status})`);
          }

          const { text } = await res.json();
          if (!text || !text.trim()) {
            setLogError('No speech detected — please try again');
            return;
          }

          // Fill the textarea with transcribed text and auto-submit
          setSymptomText(text.trim());

          // Auto-submit to structuring flow
          setIsLogging(true);
          setLogError(null);
          try {
            const structRes = await fetch('/api/structure', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ text: text.trim() }),
            });
            if (!structRes.ok) {
              const err = await structRes.json().catch(() => ({}));
              throw new Error(err.error || `Request failed (${structRes.status})`);
            }
            const entry = await structRes.json();
            // Override source_modality to voice
            entry.source_modality = 'voice';
            setLogEntries(prev => [entry, ...prev]);
            setSymptomText('');
          } catch (err) {
            setLogError(err.message);
          } finally {
            setIsLogging(false);
          }

        } catch (err) {
          setLogError(err.message);
        } finally {
          setIsTranscribing(false);
        }
      };

      mediaRecorder.start(250); // collect chunks every 250ms
      setIsRecording(true);
      setRecordingDuration(0);

      // Duration counter
      const startTime = Date.now();
      recordingTimerRef.current = setInterval(() => {
        setRecordingDuration(Math.floor((Date.now() - startTime) / 1000));
      }, 1000);

    } catch (err) {
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setLogError('Microphone permission denied — please allow mic access');
      } else {
        setLogError('Could not access microphone: ' + err.message);
      }
    }
  }, []);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
  }, []);

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
          <button 
            className={`nav-item ${!activeDrawer ? "active" : ""}`}
            onClick={() => handleNavClick('screening')}
          >
            <HeartPulse className="nav-item-icon" />
            <span className="tooltip-box">Risk Screening</span>
          </button>
          <button 
            className="nav-item"
            onClick={() => handleNavClick('symptom_log')}
          >
            <ClipboardList className="nav-item-icon" />
            <span className="tooltip-box">Symptom Log</span>
          </button>
          <button 
            className={`nav-item ${activeDrawer === 'model' ? "active" : ""}`}
            onClick={() => handleNavClick('model')}
          >
            <Sparkles className="nav-item-icon" />
            <span className="tooltip-box">Model Details</span>
          </button>
          <button 
            className={`nav-item ${activeDrawer === 'schema' ? "active" : ""}`}
            onClick={() => handleNavClick('schema')}
          >
            <Info className="nav-item-icon" />
            <span className="tooltip-box">Schema Guide</span>
          </button>
        </nav>

        <div className="sidebar-bottom">
          <button 
            className={`nav-item ${activeDrawer === 'settings' ? "active" : ""}`}
            onClick={() => handleNavClick('settings')}
          >
            <Settings className="nav-item-icon" />
            <span className="tooltip-box">Settings</span>
          </button>
          <button 
            className={`nav-item ${activeDrawer === 'help' ? "active" : ""}`}
            onClick={() => handleNavClick('help')}
          >
            <HelpCircle className="nav-item-icon" />
            <span className="tooltip-box">Help Support</span>
          </button>
        </div>
      </aside>

      {/* 2. Central Workspace Area */}
      <main className="main-content-panel" ref={mainWorkspaceRef}>
        
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
            <p>Lumen helps you notice patterns associated with PCOS (polycystic ovary syndrome) and prepare a summary to discuss with a doctor. It doesn't diagnose.</p>
          </div>
          <button className="welcome-badge-btn" onClick={() => setShowExportModal(true)}>
            <Download style={{ width: 16, height: 16 }} />
            <span>Export</span>
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
          <div className={`metric-card ${riskResult.band} ${isUpdatingSignal ? "signal-pulse" : ""}`}>
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
              <span className={`metric-value ${isUpdatingSignal ? "signal-text-updating" : ""}`}>
                {animatedPercentage}%
              </span>
            </div>
            <span className="metric-sub" style={{ 
              color: riskResult.band === "lower" ? "var(--emerald-text)" : 
                     riskResult.band === "moderate" ? "var(--amber-text)" : "var(--rose-text)" 
            }}>
              {riskResult.band.toUpperCase()} RISK PATTERN
            </span>
          </div>
        </section>

        {/* Calm supportive banner for higher-risk screening signal */}
        {riskResult.band === "higher" && (
          <div className="higher-risk-support-card">
            <div className="support-card-left">
              <HeartPulse className="support-card-icon" />
              <div className="support-card-text">
                <strong className="support-card-title">A gentle note on your screening signal</strong>
                <p className="support-card-desc">
                  A higher-risk pattern is <strong>not a diagnosis</strong> — it simply means your self-reported markers show a pattern worth discussing with a qualified doctor. You can download your 1-page summary to bring directly to that visit.
                </p>
              </div>
            </div>
            <button className="pdf-download-btn support-card-pdf-btn" onClick={downloadPDF}>
              <FileText style={{ width: 15, height: 15 }} />
              <span>Get Doctor Summary (PDF)</span>
            </button>
          </div>
        )}

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
                <span className="panel-title" style={{ fontSize: "17px" }}>Screening Signal Factors</span>
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

        {/* Symptom Log Input */}
        <div className="sidebar-section" ref={symptomLogRef}>
          <span className="sidebar-section-title">Log How You Feel</span>
          
          <div className="symptom-input-wrapper">
            <textarea
              className="symptom-textarea"
              placeholder="e.g. Slept about 5 hours, foggy all morning, cramps are killing me..."
              value={symptomText}
              onChange={(e) => setSymptomText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  submitSymptomLog();
                }
              }}
              rows={3}
              disabled={isLogging || isRecording || isTranscribing}
            />
            <div className="symptom-actions-row">
              <button 
                className={`mic-btn ${isRecording ? "recording" : ""} ${isTranscribing ? "transcribing" : ""}`}
                onClick={isRecording ? stopRecording : startRecording}
                disabled={isLogging || isTranscribing}
                title={isRecording ? "Stop recording" : isTranscribing ? "Transcribing…" : "Record voice note"}
              >
                {isTranscribing ? (
                  <><Loader className="spin-icon" style={{ width: 14, height: 14 }} /> <span>Transcribing…</span></>
                ) : isRecording ? (
                  <>
                    <MicOff style={{ width: 14, height: 14 }} />
                    <span className="recording-pulse"></span>
                    <span>{recordingDuration}s — tap to stop</span>
                  </>
                ) : (
                  <><Mic style={{ width: 14, height: 14 }} /> <span>Voice</span></>
                )}
              </button>
              <button 
                className={`symptom-submit-btn ${isLogging ? "loading" : ""}`}
                onClick={submitSymptomLog}
                disabled={isLogging || !symptomText.trim() || isRecording || isTranscribing}
              >
                {isLogging 
                  ? <><Loader className="spin-icon" style={{ width: 14, height: 14 }} /> <span>Processing…</span></>
                  : <><Send style={{ width: 14, height: 14 }} /> <span>Log Entry</span></>
                }
              </button>
            </div>
            {logError && (
              <div className="symptom-error">
                <AlertCircle style={{ width: 12, height: 12 }} />
                <span>{logError}</span>
              </div>
            )}
          </div>
        </div>

        {/* Timeline */}
        <div className="sidebar-section">
          <span className="sidebar-section-title">Symptom Timeline</span>
          <div className="timeline-list">
            {logEntries.length === 0 && (
              <div className="timeline-empty warm-first-run">
                <Sparkles style={{ width: 22, height: 22, color: "var(--rose-text)" }} />
                <strong className="first-run-title">Welcome to your symptom journal</strong>
                <p className="first-run-desc">
                  Lumen is a gentle, private space to track how you feel each day and prepare a clear summary to share with your doctor.
                </p>
              </div>
            )}
            {logEntries.map((entry) => {
              const isExpanded = expandedEntry === entry.entry_id;
              return (
                <div key={entry.entry_id} className="timeline-entry-card">
                  <div className="timeline-entry-header">
                    <div className="timeline-entry-meta">
                      <span className="timeline-entry-time">
                        <Clock style={{ width: 11, height: 11 }} />
                        {timeAgo(entry.logged_at)}
                      </span>
                      {entry.cycle_day && (
                        <span className="timeline-badge cycle-badge">
                          <Calendar style={{ width: 11, height: 11 }} />
                          CD {entry.cycle_day}
                        </span>
                      )}
                      {entry.sleep_hours != null && (
                        <span className="timeline-badge sleep-badge">
                          <Moon style={{ width: 11, height: 11 }} />
                          {entry.sleep_hours}h
                        </span>
                      )}
                      {entry.stress_level != null && (
                        <span className="timeline-badge stress-badge">
                          <Zap style={{ width: 11, height: 11 }} />
                          Stress: {SEVERITY_LABELS[entry.stress_level]}
                        </span>
                      )}
                    </div>
                    <button 
                      className={`timeline-expand-btn ${isExpanded ? "expanded" : ""}`}
                      onClick={() => setExpandedEntry(isExpanded ? null : entry.entry_id)}
                      title="Show raw entry"
                    >
                      <ChevronRight style={{ width: 14, height: 14 }} />
                    </button>
                  </div>

                  {/* Symptom pills */}
                  <div className="symptom-pills">
                    {entry.symptoms.map((s, i) => (
                      <span 
                        key={`${s.code}-${i}`} 
                        className={`symptom-pill ${SEVERITY_CLASSES[s.severity] || "sev-1"}`}
                        title={s.note || SEVERITY_LABELS[s.severity]}
                      >
                        {SYMPTOM_LABELS[s.code] || s.code}
                        <span className="pill-severity">{SEVERITY_LABELS[s.severity]}</span>
                      </span>
                    ))}
                  </div>

                  {/* Raw text */}
                  {entry._raw_text && (
                    <div className="timeline-raw-text">"{entry._raw_text}"</div>
                  )}

                  {/* Expanded JSON view */}
                  {isExpanded && (
                    <pre className="timeline-json-view">
                      {JSON.stringify(entry, null, 2)}
                    </pre>
                  )}
                </div>
              );
            })}
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
              
              <div style={{ display: 'flex', gap: 6 }}>
                <button 
                  onClick={downloadPDF} 
                  className="export-btn"
                  title="Download Doctor Summary as PDF"
                >
                  <FileText style={{ width: 13, height: 13 }} />
                  <span>PDF</span>
                </button>
                <button 
                  onClick={copyToClipboard} 
                  className={`export-btn ${copied ? "success" : ""}`}
                >
                  {copied ? <Check style={{ width: 12, height: 12 }} /> : <Copy style={{ width: 12, height: 12 }} />}
                  <span>{copied ? "Copied" : "Copy"}</span>
                </button>
              </div>
            </div>
            
            <pre className="export-guide-preview">
              {doctorSummaryText}
            </pre>
          </div>
        </div>

      </aside>

      {/* Export Modal Overlay */}
      {showExportModal && (
        <div className="export-modal-overlay" onClick={() => { setShowExportModal(false); setResearchConsent(false); }}>
          <div className="export-modal" onClick={(e) => e.stopPropagation()}>
            <div className="export-modal-header">
              <h3>Export Your Data</h3>
              <button
                className="export-modal-close"
                onClick={() => { setShowExportModal(false); setResearchConsent(false); }}
              >
                <X style={{ width: 18, height: 18 }} />
              </button>
            </div>

            <div className="export-modal-body">
              {/* Safety Disclaimer */}
              <div className="export-safety-disclaimer">
                <ShieldAlert style={{ width: 18, height: 18, color: 'var(--blue-primary)', flexShrink: 0 }} />
                <span>
                  No name, email, or identifying information is ever included.
                </span>
              </div>

              {/* Option 1: Doctor Summary (PDF) */}
              <div className="export-option-card">
                <div className="export-option-header">
                  <div className="export-option-title-group">
                    <FileText style={{ width: 18, height: 18, color: 'var(--violet-primary)' }} />
                    <span className="export-option-title">Doctor Summary (PDF)</span>
                  </div>
                  <span className="export-option-badge private">Private</span>
                </div>
                <p className="export-option-desc">
                  A private one-page summary for your appointment. This is your own data, for you.
                </p>
                <div className="export-option-actions">
                  <button
                    className="export-btn-primary pdf-btn"
                    onClick={() => { setShowExportModal(false); setResearchConsent(false); downloadPDF(); }}
                  >
                    <FileText style={{ width: 16, height: 16 }} />
                    <span>Download Doctor Summary (PDF)</span>
                  </button>
                </div>
              </div>

              {/* Option 2: Anonymous Research Copy (JSON) */}
              <div className="export-option-card">
                <div className="export-option-header">
                  <div className="export-option-title-group">
                    <Database style={{ width: 18, height: 18, color: 'var(--teal-primary)' }} />
                    <span className="export-option-title">Anonymous Research Copy (JSON)</span>
                  </div>
                  <span className="export-option-badge research">Open Format</span>
                </div>
                <p className="export-option-desc">
                  A de-identified copy in an open format that can be contributed to PCOS research. No name, email, or identifying info is included. Nothing is uploaded automatically — you choose where it goes.
                </p>
                
                {/* Research Consent Checkbox */}
                <div className={`export-consent-row ${researchConsent ? 'active' : ''}`}>
                  <div className="export-consent-text">
                    <span className="export-consent-label">Contribute to open research</span>
                    <span className="export-consent-detail">
                      I consent to include an anonymous copy formatted for open research.
                    </span>
                  </div>
                  <label className="switch-widget">
                    <input
                      type="checkbox"
                      checked={researchConsent}
                      onChange={() => setResearchConsent(prev => !prev)}
                    />
                    <span className="switch-slider"></span>
                  </label>
                </div>

                <div className="export-option-actions">
                  <button
                    className="export-btn-primary json-btn"
                    disabled={!researchConsent}
                    onClick={() => downloadExport(true)}
                  >
                    <Download style={{ width: 16, height: 16 }} />
                    <span>Download lumen-export.json</span>
                  </button>
                </div>
              </div>
            </div>

            <div className="export-modal-footer">
              <button
                className="export-modal-cancel"
                onClick={() => { setShowExportModal(false); setResearchConsent(false); }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Slide-over Drawer Overlay */}
      {activeDrawer && (
        <div className="drawer-overlay" onClick={() => setActiveDrawer(null)}>
          <aside className="slide-drawer" onClick={(e) => e.stopPropagation()}>
            <div className="drawer-header">
              <div className="drawer-title-group">
                {activeDrawer === 'model' && <Sparkles className="drawer-icon" />}
                {activeDrawer === 'schema' && <Info className="drawer-icon" />}
                {activeDrawer === 'settings' && <Settings className="drawer-icon" />}
                {activeDrawer === 'help' && <HelpCircle className="drawer-icon" />}
                <h3>
                  {activeDrawer === 'model' && 'Model Card Details'}
                  {activeDrawer === 'schema' && 'Schema & Vocabulary'}
                  {activeDrawer === 'settings' && 'App Settings'}
                  {activeDrawer === 'help' && 'Help & FAQ Guide'}
                </h3>
              </div>
              <button className="drawer-close-btn" onClick={() => setActiveDrawer(null)}>
                <X style={{ width: 18, height: 18 }} />
              </button>
            </div>

            <div className="drawer-body">
              {/* MODEL CARD DRAWER */}
              {activeDrawer === 'model' && (
                <div className="drawer-content">
                  <div className="drawer-badge-row">
                    <span className="drawer-pill">v0.1.0</span>
                    <span className="drawer-pill">Logistic Regression</span>
                    <span className="drawer-pill">13 Features</span>
                  </div>
                  <p className="drawer-intro">
                    Lumen uses a self-report machine learning model trained on the Kottarathil PCOS dataset (541 records across 10 hospitals in Kerala, India) to evaluate risk patterns without lab tests or ultrasounds.
                  </p>

                  <h4 className="drawer-subhead">Held-out Test Split Performance</h4>
                  <div className="drawer-table-wrapper">
                    <table className="drawer-table">
                      <thead>
                        <tr>
                          <th>Model</th>
                          <th>Accuracy</th>
                          <th>Recall</th>
                          <th>AUC</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr className="active-row">
                          <td>Self-Report LR (App)</td>
                          <td>87.2%</td>
                          <td>75.0%</td>
                          <td>0.886</td>
                        </tr>
                        <tr>
                          <td>Benchmark RF (41 features)</td>
                          <td>91.7%</td>
                          <td>77.8%</td>
                          <td>0.955</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  <h4 className="drawer-subhead">13 Self-Reported Features</h4>
                  <p className="drawer-text">
                    Age, Weight, Height, BMI, Cycle Regularity, Period Length, Weight Gain, Excess Hair Growth, Skin Darkening, Hair Loss, Pimples, Fast Food, Regular Exercise.
                  </p>

                  <div className="drawer-alert">
                    <ShieldAlert style={{ width: 16, height: 16, flexShrink: 0, color: 'var(--amber-primary)' }} />
                    <span>
                      Recall is 0.75 — the model misses ~1 in 4 true positives. Scores are framed as screening signals, not medical diagnoses.
                    </span>
                  </div>
                </div>
              )}

              {/* SCHEMA GUIDE DRAWER */}
              {activeDrawer === 'schema' && (
                <div className="drawer-content">
                  <div className="drawer-badge-row">
                    <span className="drawer-pill">HerLog v0.1.0</span>
                    <span className="drawer-pill">JSON Schema</span>
                    <span className="drawer-pill">CC-BY-4.0</span>
                  </div>
                  <p className="drawer-intro">
                    HerLog standardizes natural-language symptom logs into canonical codes so records are comparable across users and research datasets.
                  </p>

                  <h4 className="drawer-subhead">Controlled Vocabulary Codes</h4>
                  <div className="vocab-chip-list">
                    {Object.entries(SYMPTOM_LABELS).map(([code, label]) => (
                      <div key={code} className="vocab-tag">
                        <code className="vocab-code">{code}</code>
                        <span className="vocab-label">{label}</span>
                      </div>
                    ))}
                  </div>

                  <h4 className="drawer-subhead">Severity Scale</h4>
                  <div className="sev-bar">
                    <span className="sev-item sev-0">0: None</span>
                    <span className="sev-item sev-1">1: Mild</span>
                    <span className="sev-item sev-2">2: Moderate</span>
                    <span className="sev-item sev-3">3: Severe</span>
                  </div>
                </div>
              )}

              {/* SETTINGS DRAWER */}
              {activeDrawer === 'settings' && (
                <div className="drawer-content">
                  <h4 className="drawer-subhead">Storage &amp; Data</h4>
                  <div className="drawer-settings-box">
                    <div className="drawer-setting-row">
                      <div className="setting-info">
                        <Database style={{ width: 16, height: 16, color: 'var(--blue-primary)' }} />
                        <div>
                          <strong>LocalStorage Status</strong>
                          <span>Saved in your browser</span>
                        </div>
                      </div>
                      <span className="console-badge">Active</span>
                    </div>
                    <div className="drawer-setting-row">
                      <div className="setting-info">
                        <ClipboardList style={{ width: 16, height: 16, color: 'var(--violet-primary)' }} />
                        <div>
                          <strong>Logged Entries</strong>
                          <span>{logEntries.length} entries saved</span>
                        </div>
                      </div>
                      <span className="console-badge">{logEntries.length}</span>
                    </div>
                  </div>

                  <h4 className="drawer-subhead">Export Data</h4>
                  <button className="export-modal-download" style={{ width: '100%', justifyContent: 'center' }} onClick={() => { setActiveDrawer(null); setShowExportModal(true); }}>
                    <Download style={{ width: 15, height: 15 }} />
                    <span>Export JSON Dataset</span>
                  </button>
                </div>
              )}

              {/* HELP DRAWER */}
              {activeDrawer === 'help' && (
                <div className="drawer-content">
                  <h4 className="drawer-subhead">Frequently Asked Questions</h4>
                  <div className="drawer-faq-list">
                    <div className="drawer-faq-item">
                      <strong>How does Voice Logging work?</strong>
                      <p>Tap Voice to record. OpenAI Whisper transcribes your speech and structures it into standardized symptom entries.</p>
                    </div>
                    <div className="drawer-faq-item">
                      <strong>What does the Screening Signal mean?</strong>
                      <p>It measures how closely your self-reported markers align with statistical patterns — it is a discussion aid, not a diagnosis.</p>
                    </div>
                    <div className="drawer-faq-item">
                      <strong>Is my data private?</strong>
                      <p>Yes. All entries stay stored in your browser. Exported files omit direct identifiers.</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </aside>
        </div>
      )}

    </div>
  );
}