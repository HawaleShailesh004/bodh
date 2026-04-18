"use client";

import { motion, AnimatePresence, useScroll, useSpring } from "framer-motion";
import { useState, useEffect, useRef } from "react";
import type { Lang } from "@/lib/types";
import { t } from "@/lib/constants";

// ── Icons ────────────────────────────────────────────────────────
const Icon = {
  Shield: () => (<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg>),
  Globe: () => (<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" /><path d="M2 12h20" /></svg>),
  Brain: () => (<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9.5 2A2.5 2.5 0 0 1 12 4.5v15a2.5 2.5 0 0 1-4.96.44 2.5 2.5 0 0 1-2.96-3.08 3 3 0 0 1-.34-5.58 2.5 2.5 0 0 1 1.32-4.24 2.5 2.5 0 0 1 1.98-3A2.5 2.5 0 0 1 9.5 2Z" /><path d="M14.5 2A2.5 2.5 0 0 0 12 4.5v15a2.5 2.5 0 0 0 4.96.44 2.5 2.5 0 0 0 2.96-3.08 3 3 0 0 0 .34-5.58 2.5 2.5 0 0 0-1.32-4.24 2.5 2.5 0 0 0-1.98-3A2.5 2.5 0 0 0 14.5 2Z" /></svg>),
  Check: () => (<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></svg>),
  File: () => (<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /></svg>),
  Upload: () => (<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" /></svg>),
  Camera: () => (<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" /><circle cx="12" cy="13" r="4" /></svg>),
  Trash: () => (<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></svg>),
  Lock: () => (<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>),
  Zap: () => (<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" /></svg>),
  Heart: () => (<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" /></svg>),
  Arrow: () => (<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" /></svg>),
  Volume: () => (<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" /><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07" /></svg>),
};

// ── FIX 1: Scroll progress bar ───────────────────────────────────
function ScrollProgressBar() {
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, { stiffness: 100, damping: 30, restDelta: 0.001 });
  return (
    <motion.div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        height: 3,
        background: "linear-gradient(90deg, #064E3B, #34D399)",
        transformOrigin: "0%",
        scaleX,
        zIndex: 9999,
      }}
    />
  );
}

// ── FIX 7: Stat counter – tuned speed per magnitude ─────────────
function StatCounter({ target, suffix = "" }: { target: number; suffix?: string }) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  const started = useRef(false);

  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && !started.current) {
        started.current = true;
        // Slower for big numbers so it doesn't look janky
        const duration = target > 100 ? 2000 : 1400;
        const start = performance.now();
        const animate = (now: number) => {
          const progress = Math.min((now - start) / duration, 1);
          const ease = 1 - Math.pow(1 - progress, 3);
          setCount(Math.round(ease * target));
          if (progress < 1) requestAnimationFrame(animate);
        };
        requestAnimationFrame(animate);
      }
    }, { threshold: 0.5 });
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [target]);

  return <div ref={ref}>{count}{suffix}</div>;
}

// ── FIX 3 + 12: ProductMock with scan line + auto-cycle severity ─
const SEVERITY_CYCLE = [
  {
    key: "watch",
    headerBg: "linear-gradient(135deg, #78350F, #B45309)",
    label: "WATCH",
    headline: "Some values need attention",
    score: 74,
    scoreColor: "#FCD34D",
    scoreOffset: 27,
    cards: [
      { name: "Haemoglobin", value: "9.2 g%", color: "#E11D48", bg: "#FFF1F2", border: "#FECDD3", badgeBg: "#FEE2E2", badgeText: "#881337", badge: "ACT NOW", markerLeft: "16%" },
      { name: "Platelet Count", value: "1,40,000", color: "#D97706", bg: "#FFFBEB", border: "#FDE68A", badgeBg: "#FEF3C7", badgeText: "#78350F", badge: "WATCH", markerLeft: "31%" },
      { name: "Total WBC", value: "7,200", color: "#10B981", bg: "white", border: "#E2E8F0", badgeBg: "#D1FAE5", badgeText: "#065F46", badge: "NORMAL", markerLeft: "52%" },
    ],
  },
  {
    key: "normal",
    headerBg: "linear-gradient(135deg, #064E3B, #0D6B5E)",
    label: "NORMAL",
    headline: "All values look healthy",
    score: 95,
    scoreColor: "#34D399",
    scoreOffset: 6,
    cards: [
      { name: "Haemoglobin", value: "13.8 g%", color: "#10B981", bg: "white", border: "#E2E8F0", badgeBg: "#D1FAE5", badgeText: "#065F46", badge: "NORMAL", markerLeft: "52%" },
      { name: "TSH", value: "2.4 uIU/mL", color: "#10B981", bg: "white", border: "#E2E8F0", badgeBg: "#D1FAE5", badgeText: "#065F46", badge: "NORMAL", markerLeft: "48%" },
      { name: "HbA1c", value: "5.4%", color: "#10B981", bg: "white", border: "#E2E8F0", badgeBg: "#D1FAE5", badgeText: "#065F46", badge: "NORMAL", markerLeft: "44%" },
    ],
  },
  {
    key: "actnow",
    headerBg: "linear-gradient(135deg, #7F1D1D, #B91C1C)",
    label: "ACT NOW",
    headline: "Urgent attention required",
    score: 42,
    scoreColor: "#F87171",
    scoreOffset: 62,
    cards: [
      { name: "HbA1c", value: "8.1%", color: "#E11D48", bg: "#FFF1F2", border: "#FECDD3", badgeBg: "#FEE2E2", badgeText: "#881337", badge: "ACT NOW", markerLeft: "78%" },
      { name: "LDL Cholesterol", value: "178 mg/dL", color: "#E11D48", bg: "#FFF1F2", border: "#FECDD3", badgeBg: "#FEE2E2", badgeText: "#881337", badge: "ACT NOW", markerLeft: "82%" },
      { name: "Creatinine", value: "1.9 mg/dL", color: "#D97706", bg: "#FFFBEB", border: "#FDE68A", badgeBg: "#FEF3C7", badgeText: "#78350F", badge: "WATCH", markerLeft: "68%" },
    ],
  },
];

function ProductMock() {
  const [sevIdx, setSevIdx] = useState(0);
  const [expanded, setExpanded] = useState(false);
  const sev = SEVERITY_CYCLE[sevIdx];
  const circ = 2 * Math.PI * 17;

  // FIX 12: auto-cycle severity every 3.5s
  useEffect(() => {
    const id = setInterval(() => {
      setSevIdx(p => (p + 1) % SEVERITY_CYCLE.length);
      setExpanded(false);
    }, 3500);
    return () => clearInterval(id);
  }, []);

  return (
    <div style={{ width: "100%", maxWidth: 360, background: "white", borderRadius: 20, border: "1px solid #E4E4E7", overflow: "hidden", boxShadow: "0 24px 48px rgba(0,0,0,0.1), 0 4px 12px rgba(0,0,0,0.04)" }}>
      {/* Header – cross-fades on severity change */}
      <AnimatePresence mode="wait">
        <motion.div
          key={sev.key}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.4 }}
          style={{ background: sev.headerBg, padding: "16px 18px", position: "relative", overflow: "hidden" }}
        >
          <div style={{ position: "absolute", width: 160, height: 160, borderRadius: "50%", border: "1px solid rgba(255,255,255,0.08)", top: -60, right: -40 }} />
          <div style={{ fontSize: 10, fontWeight: 700, color: "rgba(255,255,255,0.7)", letterSpacing: "0.1em", marginBottom: 4 }}>{sev.label}</div>
          <div style={{ fontSize: 17, fontWeight: 800, color: "white", lineHeight: 1.2, marginBottom: 8 }}>{sev.headline}</div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ fontSize: 10, color: "rgba(255,255,255,0.55)" }}>18 values · 19.2s</div>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
              <svg width="40" height="40" viewBox="0 0 48 48">
                <circle cx="24" cy="24" r="17" fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="4" />
                <motion.circle
                  cx="24" cy="24" r="17" fill="none"
                  stroke={sev.scoreColor} strokeWidth="4" strokeLinecap="round"
                  strokeDasharray={circ}
                  animate={{ strokeDashoffset: sev.scoreOffset }}
                  transition={{ duration: 0.8, ease: "easeOut" }}
                  transform="rotate(-90 24 24)"
                />
                <text x="24" y="29" textAnchor="middle" fontSize="12" fontWeight="800" fill="white">{sev.score}</text>
              </svg>
              <div style={{ fontSize: 8, color: "rgba(255,255,255,0.5)", marginTop: 2 }}>Health Score</div>
            </div>
          </div>
        </motion.div>
      </AnimatePresence>

      {/* Cards body */}
      <div style={{ padding: "12px", display: "flex", flexDirection: "column", gap: 8, background: "#F8FAFC", position: "relative", overflow: "hidden" }}>
        {/* FIX 3: Scan line */}
        <motion.div
          style={{ position: "absolute", left: 0, right: 0, height: 2, background: "linear-gradient(90deg, transparent, #0D6B5E, transparent)", opacity: 0.6, zIndex: 10 }}
          animate={{ top: ["0%", "100%", "0%"] }}
          transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
        />

        <AnimatePresence mode="wait">
          <motion.div
            key={sev.key + "-cards"}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.35 }}
            style={{ display: "flex", flexDirection: "column", gap: 8 }}
          >
            {sev.cards.map((card, ci) => (
              <div
                key={card.name}
                onClick={() => ci === 0 && setExpanded(e => !e)}
                style={{ background: card.bg, border: `1.5px solid ${card.border}`, borderRadius: 12, padding: "10px 12px", cursor: ci === 0 ? "pointer" : "default" }}
              >
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <div style={{ width: 6, height: 6, borderRadius: "50%", background: card.color }} />
                    <span style={{ fontWeight: 600, fontSize: 13, color: "#0F172A" }}>{card.name}</span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <span style={{ fontFamily: "monospace", fontWeight: 800, fontSize: 13, color: card.color }}>{card.value}</span>
                    <span style={{ background: card.badgeBg, color: card.badgeText, fontSize: 9, fontWeight: 700, padding: "2px 6px", borderRadius: 20 }}>{card.badge}</span>
                  </div>
                </div>
                <div style={{ height: 4, background: "#E2E8F0", borderRadius: 4, position: "relative" }}>
                  <div style={{ position: "absolute", left: "33%", width: "34%", height: "100%", background: "#A7F3D0", borderRadius: 4 }} />
                  <div style={{ position: "absolute", left: card.markerLeft, top: "50%", transform: "translate(-50%,-50%)", width: 10, height: 10, borderRadius: "50%", background: card.color, border: "2px solid white" }} />
                </div>
                {ci === 0 && expanded && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} style={{ marginTop: 8, paddingTop: 8, borderTop: `1px solid ${card.border}` }}>
                    <p style={{ fontSize: 11, color: "#7F1D1D", lineHeight: 1.5 }}>Your haemoglobin is lower than normal. This means your blood may not be carrying enough oxygen. See a doctor soon.</p>
                    <div style={{ marginTop: 6, padding: "6px 8px", background: "#FFFBEB", borderLeft: "2px solid #D97706", borderRadius: "0 6px 6px 0", fontSize: 10, color: "#78350F" }}>
                      <strong>Diet tip:</strong> Eat palak, methi, rajma, chana and jaggery daily.
                    </div>
                  </motion.div>
                )}
              </div>
            ))}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Severity indicator dots */}
      <div style={{ display: "flex", justifyContent: "center", gap: 6, padding: "8px 0 10px", background: "#F8FAFC" }}>
        {SEVERITY_CYCLE.map((_, i) => (
          <motion.div
            key={i}
            onClick={() => setSevIdx(i)}
            style={{ height: 5, borderRadius: 3, cursor: "pointer", background: i === sevIdx ? "#0D6B5E" : "#D4D4D8" }}
            animate={{ width: i === sevIdx ? 16 : 5 }}
            transition={{ duration: 0.3 }}
          />
        ))}
      </div>
    </div>
  );
}

// ── Language demo card (FIX 8: pause on hover) ──────────────────
const DEMO_CONTENT = {
  en: { name: "Haemoglobin", value: "9.2 g%", badge: "Act Now", badgeBg: "#FEE2E2", badgeText: "#881337", explanation: "Your hemoglobin is significantly lower than normal. This means your blood cannot carry enough oxygen. Please see a doctor soon." },
  hi: { name: "हीमोग्लोबिन", value: "9.2 g%", badge: "तुरंत करें", badgeBg: "#FEE2E2", badgeText: "#881337", explanation: "आपका हीमोग्लोबिन सामान्य से काफी कम है। इसका मतलब है कि आपका खून पर्याप्त ऑक्सीजन नहीं ले जा सकता। कृपया जल्दी डॉक्टर से मिलें।" },
  mr: { name: "हिमोग्लोबिन", value: "9.2 g%", badge: "आत्ता करा", badgeBg: "#FEE2E2", badgeText: "#881337", explanation: "तुमचा हिमोग्लोबिन सामान्यपेक्षा खूपच कमी आहे. याचा अर्थ तुमचे रक्त पुरेसा ऑक्सिजन वाहू शकत नाही. कृपया लवकरात लवकर डॉक्टरांना भेटा." },
};

function LanguageDemoCard({ activeLang, onHover }: { activeLang: Lang; onHover: (v: boolean) => void }) {
  const content = DEMO_CONTENT[activeLang];
  return (
    <div
      onMouseEnter={() => onHover(true)}
      onMouseLeave={() => onHover(false)}
      style={{ background: "white", border: "1px solid #E4E4E7", borderRadius: 16, padding: 20, boxShadow: "0 2px 8px rgba(0,0,0,0.04)" }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
        <div>
          <div style={{ fontSize: 10, color: "#A1A1AA", fontWeight: 600, letterSpacing: "0.05em", marginBottom: 2 }}>BIOMARKER</div>
          <AnimatePresence mode="wait">
            <motion.div key={activeLang + "name"} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} style={{ fontSize: 18, fontWeight: 700, color: "#09090B" }}>{content.name}</motion.div>
          </AnimatePresence>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontFamily: "monospace", fontSize: 22, fontWeight: 800, color: "#E11D48" }}>{content.value}</div>
          <div style={{ fontSize: 9, fontWeight: 700, padding: "2px 8px", borderRadius: 20, background: content.badgeBg, color: content.badgeText, display: "inline-block" }}>{content.badge}</div>
        </div>
      </div>
      <AnimatePresence mode="wait">
        <motion.p key={activeLang + "expl"} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.3 }} style={{ fontSize: 13, color: "#52525B", lineHeight: 1.6 }}>
          {content.explanation}
        </motion.p>
      </AnimatePresence>
    </div>
  );
}

// ── Main component ───────────────────────────────────────────────
interface LandingPageProps { lang: Lang; onStart: () => void; }

export default function LandingPage({ lang, onStart }: LandingPageProps) {
  const [demoLang, setDemoLang] = useState<Lang>("en");
  const [demoPaused, setDemoPaused] = useState(false); // FIX 8

  // FIX 8: pause auto-cycle on hover
  useEffect(() => {
    if (demoPaused) return;
    const langs: Lang[] = ["en", "hi", "mr"];
    let i = 0;
    const timer = setInterval(() => { i = (i + 1) % langs.length; setDemoLang(langs[i]); }, 2800);
    return () => clearInterval(timer);
  }, [demoPaused]);

  const reportCategories = [
    { name: { en: "Complete Blood Count", hi: "पूर्ण रक्त गणना", mr: "संपूर्ण रक्त मोजणी" }, abbr: "CBC", markers: ["Haemoglobin", "WBC", "Platelets", "RBC", "PCV", "+12 more"], color: "#E11D48", bg: "#FFF1F2", hoverBorder: "#FECDD3" },
    { name: { en: "Liver Function Test", hi: "लिवर फंक्शन टेस्ट", mr: "यकृत कार्य चाचणी" }, abbr: "LFT", markers: ["ALT/SGPT", "AST/SGOT", "Bilirubin", "Albumin", "+4 more"], color: "#D97706", bg: "#FFFBEB", hoverBorder: "#FDE68A" },
    { name: { en: "Kidney Function Test", hi: "किडनी फंक्शन टेस्ट", mr: "मूत्रपिंड कार्य चाचणी" }, abbr: "KFT", markers: ["Creatinine", "Urea", "Uric Acid", "eGFR", "+2 more"], color: "#7C3AED", bg: "#F5F3FF", hoverBorder: "#DDD6FE" },
    { name: { en: "Lipid Profile", hi: "लिपिड प्रोफाइल", mr: "लिपिड प्रोफाइल" }, abbr: "LIPID", markers: ["Total Cholesterol", "LDL", "HDL", "Triglycerides", "+1 more"], color: "#0891B2", bg: "#ECFEFF", hoverBorder: "#A5F3FC" },
    { name: { en: "Thyroid Panel", hi: "थायरॉइड पैनल", mr: "थायरॉइड पॅनेल" }, abbr: "TFT", markers: ["TSH", "T3", "T4", "Free T3", "Free T4"], color: "#059669", bg: "#ECFDF5", hoverBorder: "#A7F3D0" },
    { name: { en: "Blood Glucose", hi: "रक्त शर्करा", mr: "रक्त शर्करा" }, abbr: "HBA1C", markers: ["Fasting Glucose", "PP Glucose", "HbA1c", "Random BS"], color: "#B45309", bg: "#FEF3C7", hoverBorder: "#FDE68A" },
  ];

  const privacySteps = [
    { icon: <Icon.Camera />, en: "Upload Report", hi: "रिपोर्ट अपलोड", mr: "अहवाल अपलोड", desc: { en: "PDF or photo from any lab", hi: "किसी भी लैब का PDF या फोटो", mr: "कोणत्याही लॅबचा PDF किंवा फोटो" } },
    { icon: <Icon.Trash />, en: "PII Stripped", hi: "PII हटाया", mr: "PII काढला", desc: { en: "Name, phone, address removed before AI", hi: "AI से पहले नाम, फोन हटाया", mr: "AI आधी नाव, फोन काढला" } },
    { icon: <Icon.Brain />, en: "AI Analyzes", hi: "AI विश्लेषण", mr: "AI विश्लेषण", desc: { en: "Anonymous biomarker data only", hi: "केवल गुमनाम बायोमार्कर", mr: "केवळ निनावी बायोमार्कर" } },
    { icon: <Icon.Check />, en: "Your Results", hi: "आपके परिणाम", mr: "तुमचे निकाल", desc: { en: "Deleted after session ends", hi: "सत्र समाप्त होने पर हटा दिया", mr: "सत्र संपल्यावर हटवले" } },
  ];

  // FIX 6: translated tech details
  const steps = [
    {
      n: "01",
      en: "Upload your report", hi: "रिपोर्ट अपलोड करें", mr: "अहवाल अपलोड करा",
      sub: { en: "PDF or photo from any Indian lab — we handle even messy formats", hi: "किसी भी भारतीय लैब का PDF या फोटो — कोई भी प्रारूप", mr: "कोणत्याही भारतीय लॅबचा PDF किंवा फोटो" },
      detail: { en: "Azure Document Intelligence + Groq Llama 3.3 extracts every value", hi: "Azure + Groq Llama 3.3 हर मान निकालता है", mr: "Azure + Groq Llama 3.3 प्रत्येक मूल्य काढतो" },
    },
    {
      n: "02",
      en: "AI analyzes it safely", hi: "AI सुरक्षित विश्लेषण करता है", mr: "AI सुरक्षितपणे विश्लेषण करतो",
      sub: { en: "PII stripped → ICMR ranges applied → severity classified deterministically", hi: "PII हटाया → ICMR मानक → गंभीरता वर्गीकृत", mr: "PII काढला → ICMR मानक → गंभीरता वर्गीकृत" },
      detail: { en: "Rules decide severity — AI only writes the plain-language explanation", hi: "नियम गंभीरता तय करते हैं — AI केवल स्पष्टीकरण लिखता है", mr: "नियम तीव्रता ठरवतात — AI फक्त स्पष्टीकरण लिहितो" },
    },
    {
      n: "03",
      en: "Understand your health", hi: "अपनी सेहत समझें", mr: "तुमचे आरोग्य समजा",
      sub: { en: "Plain language, diet tips, specialist recommendation, doctor questions", hi: "सरल भाषा, आहार सुझाव, विशेषज्ञ अनुशंसा", mr: "साधी भाषा, आहार सुचना, तज्ञ शिफारस" },
      detail: { en: "Share summary with your doctor on WhatsApp in one tap", hi: "एक टैप में WhatsApp पर डॉक्टर को सारांश भेजें", mr: "एका टॅपमध्ये WhatsApp वर डॉक्टरांना सारांश पाठवा" },
    },
  ];

  const labs = ["SRL Diagnostics", "Lal PathLabs", "Metropolis", "Thyrocare", "Apollo Diagnostics", "Dr Lal PathLabs", "AIIMS Reports", "Govt. Hospitals", "Redcliffe Labs", "Vijaya Diagnostics"];

  const fadeUp = {
    initial: { opacity: 0, y: 28 },
    whileInView: { opacity: 1, y: 0 },
    viewport: { once: true },
  };

  return (
    <div className="w-full" style={{ background: "#FAFAFA", fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif" }}>
      {/* FIX 1: Scroll progress */}
      <ScrollProgressBar />

      {/* ── HERO ────────────────────────────────────────── */}
      <section style={{ position: "relative", overflow: "hidden", padding: "72px 24px 100px", background: "radial-gradient(ellipse 80% 60% at 70% 40%, #D1FAE5 0%, #FAFAFA 55%)" }}>
        <div style={{ position: "absolute", inset: 0, zIndex: 0, backgroundImage: "radial-gradient(#D4D4D8 1px, transparent 1px)", backgroundSize: "28px 28px", opacity: 0.45 }} />
        <div style={{ maxWidth: 1160, margin: "0 auto", display: "flex", flexWrap: "wrap", alignItems: "center", gap: 64, position: "relative", zIndex: 1 }}>

          {/* Left copy */}
          <div style={{ flex: "1 1 480px" }}>
            <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
              <div style={{ display: "inline-flex", alignItems: "center", gap: 7, background: "#ECFDF5", border: "1px solid #A7F3D0", borderRadius: 24, padding: "6px 14px", marginBottom: 28, fontSize: 12, color: "#065F46", fontWeight: 600 }}>
                <Icon.Check />
                {lang === "hi" ? "ICMR सत्यापित · भारत के लिए" : lang === "mr" ? "ICMR सत्यापित · भारतासाठी" : "ICMR Verified · Built for India"}
              </div>

              <h1 style={{ fontFamily: "Georgia, serif", fontSize: "clamp(38px, 5vw, 62px)", fontWeight: 800, color: "#09090B", lineHeight: 1.1, marginBottom: 22, letterSpacing: "-1.5px" }}>
                {lang === "hi" ? (<>अपनी लैब रिपोर्ट<br /><span style={{ color: "#0D6B5E" }}>अपनी भाषा में समझें</span></>) :
                  lang === "mr" ? (<>तुमचा लॅब अहवाल<br /><span style={{ color: "#0D6B5E" }}>तुमच्या भाषेत समजा</span></>) :
                  (<>Understand your lab report<br /><span style={{ color: "#0D6B5E" }}>in your own language.</span></>)}
              </h1>

              <p style={{ fontSize: "clamp(15px, 2vw, 18px)", color: "#52525B", lineHeight: 1.65, marginBottom: 36, maxWidth: 520 }}>
                {lang === "hi" ? "किसी भी भारतीय लैब की रिपोर्ट अपलोड करें — AI तुरंत सरल हिंदी, मराठी या अंग्रेज़ी में समझाता है। ICMR मानकों से सत्यापित।" :
                  lang === "mr" ? "कोणत्याही भारतीय लॅबचा अहवाल अपलोड करा — AI लगेच हिंदी, मराठी किंवा इंग्रजीत समजावतो. ICMR मानकांशी सत्यापित." :
                  "Upload any Indian lab report — Bodh extracts every value, verifies it against ICMR guidelines, and explains it in plain language you can actually understand."}
              </p>

              {/* FIX 4: shimmer CTA button */}
              <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                <motion.button
                  onClick={onStart}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="shimmer-btn"
                  style={{ display: "flex", alignItems: "center", gap: 8, background: "#0D6B5E", color: "white", border: "none", borderRadius: 14, padding: "14px 28px", fontSize: 15, fontWeight: 700, cursor: "pointer", boxShadow: "0 4px 20px rgba(13,107,94,0.22)", position: "relative", overflow: "hidden" }}
                >
                  <Icon.Upload />
                  {lang === "hi" ? "रिपोर्ट अपलोड करें" : lang === "mr" ? "अहवाल अपलोड करा" : "Analyze My Report"}
                  <Icon.Arrow />
                </motion.button>
                <motion.button onClick={onStart} whileHover={{ scale: 1.02, borderColor: "#0D6B5E", color: "#0D6B5E" }} whileTap={{ scale: 0.98 }} style={{ display: "flex", alignItems: "center", gap: 8, background: "white", color: "#09090B", border: "1.5px solid #E4E4E7", borderRadius: 14, padding: "14px 24px", fontSize: 15, fontWeight: 600, cursor: "pointer", transition: "border-color 0.2s, color 0.2s" }}>
                  <Icon.Camera />
                  {lang === "hi" ? "फोटो लें" : lang === "mr" ? "फोटो काढा" : "Take Photo"}
                </motion.button>
              </div>

              <div style={{ display: "flex", gap: 20, marginTop: 24, flexWrap: "wrap" }}>
                {[
                  { icon: <Icon.Lock />, en: "No data stored", hi: "डेटा संग्रहीत नहीं", mr: "डेटा संग्रहीत नाही" },
                  { icon: <Icon.Trash />, en: "PII stripped", hi: "PII हटाया", mr: "PII काढला" },
                  { icon: <Icon.Zap />, en: "Results in ~20s", hi: "~20 सेकंड में", mr: "~20 सेकंदात" },
                ].map((b, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12, color: "#71717A", fontWeight: 500 }}>
                    <span style={{ color: "#A1A1AA" }}>{b.icon}</span>
                    {lang === "hi" ? b.hi : lang === "mr" ? b.mr : b.en}
                  </div>
                ))}
              </div>
            </motion.div>
          </div>

          {/* Right – product mock */}
          <div style={{ flex: "1 1 340px", display: "flex", justifyContent: "center" }}>
            <motion.div initial={{ opacity: 0, x: 32 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.7, delay: 0.2 }} style={{ width: "100%", maxWidth: 360 }}>
              <motion.div animate={{ y: [-5, 5, -5] }} transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}>
                <ProductMock />
              </motion.div>
              <p style={{ textAlign: "center", fontSize: 11, color: "#A1A1AA", marginTop: 10 }}>↑ tap the first card to see an explanation · auto-cycles severities</p>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ── FIX 2: Labs marquee ──────────────────────────── */}
      <section style={{ borderTop: "1px solid #E4E4E7", borderBottom: "1px solid #E4E4E7", background: "white", padding: "18px 0", overflow: "hidden" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 0 }}>
          <div style={{ flexShrink: 0, padding: "0 24px", fontSize: 11, fontWeight: 700, color: "#A1A1AA", letterSpacing: "0.08em", textTransform: "uppercase", borderRight: "1px solid #E4E4E7", whiteSpace: "nowrap" }}>
            {lang === "hi" ? "इन लैब्स को पढ़ता है" : lang === "mr" ? "या लॅब वाचतो" : "Reads reports from"}
          </div>
          {/* Infinite scroll marquee */}
          <div style={{ overflow: "hidden", flex: 1 }}>
            <motion.div
              style={{ display: "flex", gap: 12, width: "max-content" }}
              animate={{ x: ["0%", "-50%"] }}
              transition={{ duration: 28, repeat: Infinity, ease: "linear" }}
            >
              {[...labs, ...labs].map((lab, i) => (
                <div key={i} style={{ fontSize: 12, fontWeight: 600, color: "#52525B", padding: "5px 14px", background: "#F4F4F5", borderRadius: 20, whiteSpace: "nowrap", flexShrink: 0 }}>{lab}</div>
              ))}
            </motion.div>
          </div>
        </div>
      </section>

      {/* ── STATS ───────────────────────────────────────── */}
      <section style={{ background: "#064E3B", padding: "48px 24px" }}>
        <div style={{ maxWidth: 900, margin: "0 auto", display: "flex", justifyContent: "space-around", flexWrap: "wrap", gap: 40 }}>
          {/* FIX 7: corrected numbers */}
          {[
            { target: 278, suffix: "M+", en: "lab tests run in India annually", hi: "सालाना भारत में लैब टेस्ट", mr: "वार्षिक भारतात लॅब चाचण्या" },
            { target: 15, suffix: "+", en: "ICMR-verified biomarkers", hi: "ICMR-सत्यापित बायोमार्कर", mr: "ICMR-सत्यापित बायोमार्कर" },
            { target: 3, suffix: "", en: "languages — EN, HI, MR", hi: "भाषाएं — EN, HI, MR", mr: "भाषा — EN, HI, MR" },
            { target: 100, suffix: "%", en: "deterministic severity — no AI guessing", hi: "निर्धारक गंभीरता", mr: "निर्धारक तीव्रता" },
          ].map((s, i) => (
            <motion.div key={i} {...fadeUp} transition={{ delay: i * 0.08, duration: 0.55 }} style={{ textAlign: "center" }}>
              <div style={{ fontFamily: "Georgia, serif", fontSize: 38, fontWeight: 800, color: "#A7F3D0", lineHeight: 1 }}>
                <StatCounter target={s.target} suffix={s.suffix} />
              </div>
              <div style={{ fontSize: 12, color: "#6EE7B7", fontWeight: 500, marginTop: 6, maxWidth: 140 }}>
                {lang === "hi" ? s.hi : lang === "mr" ? s.mr : s.en}
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ── PRIVACY PIPELINE ────────────────────────────── */}
      <section style={{ padding: "100px 24px", background: "white", borderTop: "1px solid #E4E4E7" }}>
        <div style={{ maxWidth: 900, margin: "0 auto" }}>
          <motion.div {...fadeUp} style={{ textAlign: "center", marginBottom: 56 }}>
            <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: "0.1em", color: "#0D6B5E", textTransform: "uppercase", marginBottom: 10 }}>
              {lang === "hi" ? "गोपनीयता पहले" : lang === "mr" ? "गोपनीयता प्रथम" : "Privacy Architecture"}
            </div>
            <h2 style={{ fontFamily: "Georgia, serif", fontSize: "clamp(26px, 4vw, 40px)", fontWeight: 700, color: "#09090B", lineHeight: 1.2 }}>
              {lang === "hi" ? "आपका व्यक्तिगत डेटा AI को कभी नहीं दिखता" : lang === "mr" ? "तुमचा वैयक्तिक डेटा AI ला कधीच दिसत नाही" : "Your personal data never reaches the AI."}
            </h2>
          </motion.div>

          {/* FIX 2: mobile-safe pipeline — column on small screens via CSS class */}
          <div className="privacy-pipeline">
            {privacySteps.map((step, i) => (
              <motion.div key={i} {...fadeUp} transition={{ delay: i * 0.1, duration: 0.55 }} className="privacy-step">
                {i < privacySteps.length - 1 && <div className="privacy-connector" />}
                <div style={{ width: 56, height: 56, borderRadius: "50%", background: i === 1 ? "#FEF2F2" : "#ECFDF5", border: `1.5px solid ${i === 1 ? "#FECACA" : "#A7F3D0"}`, display: "flex", alignItems: "center", justifyContent: "center", color: i === 1 ? "#E11D48" : "#0D6B5E", marginBottom: 16, position: "relative", zIndex: 1, boxShadow: "0 0 0 6px white" }}>
                  {step.icon}
                </div>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#09090B", marginBottom: 6 }}>
                  {lang === "mr" ? step.mr : lang === "hi" ? step.hi : step.en}
                </div>
                <div style={{ fontSize: 12, color: "#71717A", lineHeight: 1.5, maxWidth: 140 }}>{t(step.desc, lang)}</div>
              </motion.div>
            ))}
          </div>

          <motion.div {...fadeUp} transition={{ delay: 0.4 }} style={{ marginTop: 48, background: "#F4F4F5", borderRadius: 16, padding: "16px 24px", display: "flex", alignItems: "center", gap: 12 }}>
            <Icon.Lock />
            <p style={{ fontSize: 13, color: "#52525B", lineHeight: 1.6 }}>
              {lang === "hi" ? 'AI को केवल यह मिलता है: {"age": 35, "gender": "M", "biomarkers": [...]} — कोई नाम, कोई फोन नंबर नहीं।' :
                lang === "mr" ? 'AI ला फक्त हे मिळते: {"age": 35, "gender": "M", "biomarkers": [...]} — कोणतेही नाव, फोन नाही.' :
                'The AI only ever receives: {"age": 35, "gender": "M", "biomarkers": [...]} — no name, no phone, no address. Ever.'}
            </p>
          </motion.div>
        </div>
      </section>

      {/* ── LANGUAGE SHOWCASE ───────────────────────────── */}
      <section style={{ padding: "100px 24px", background: "#FAFAFA" }}>
        <div style={{ maxWidth: 1000, margin: "0 auto", display: "flex", flexWrap: "wrap", gap: 60, alignItems: "center" }}>
          <motion.div {...fadeUp} style={{ flex: "1 1 360px" }}>
            <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: "0.1em", color: "#0D6B5E", textTransform: "uppercase", marginBottom: 10 }}>
              {lang === "hi" ? "तीन भाषाओं में" : lang === "mr" ? "तीन भाषांमध्ये" : "True Multilingual"}
            </div>
            <h2 style={{ fontFamily: "Georgia, serif", fontSize: "clamp(26px, 4vw, 40px)", fontWeight: 700, color: "#09090B", lineHeight: 1.2, marginBottom: 16 }}>
              {lang === "hi" ? "हिंदी, मराठी और अंग्रेज़ी में एक साथ" : lang === "mr" ? "हिंदी, मराठी आणि इंग्रजीत एकत्र" : "Same result. Three languages. Instantly."}
            </h2>
            <p style={{ fontSize: 15, color: "#52525B", lineHeight: 1.65, marginBottom: 28 }}>
              {lang === "hi" ? "हर स्पष्टीकरण तीनों भाषाओं में एक साथ तैयार होता है। बड़े बुजुर्ग हों, बच्चे हों या डॉक्टर — सभी अपनी भाषा में पढ़ें।" :
                lang === "mr" ? "प्रत्येक स्पष्टीकरण तिन्ही भाषांमध्ये एकत्र तयार होते. वृद्ध, मुले किंवा डॉक्टर — सर्व आपल्या भाषेत वाचतात." :
                "Every explanation is generated in all three languages simultaneously. Elderly parents read in Hindi, you read in English — same report."}
            </p>
            <div style={{ display: "flex", gap: 8 }}>
              {(["en", "hi", "mr"] as Lang[]).map((l) => (
                <button key={l} onClick={() => { setDemoLang(l); setDemoPaused(true); }} style={{ padding: "8px 20px", borderRadius: 12, border: "1.5px solid", cursor: "pointer", fontWeight: 600, fontSize: 13, transition: "all 0.15s", borderColor: demoLang === l ? "#0D6B5E" : "#E4E4E7", background: demoLang === l ? "#0D6B5E" : "white", color: demoLang === l ? "white" : "#52525B" }}>
                  {l === "en" ? "English" : l === "hi" ? "हिंदी" : "मराठी"}
                </button>
              ))}
            </div>
            <div style={{ display: "flex", gap: 6, marginTop: 12, alignItems: "center" }}>
              <div style={{ width: 6, height: 6, borderRadius: "50%", background: demoPaused ? "#D97706" : "#10B981", animation: demoPaused ? "none" : "pulse 1.5s infinite" }} />
              <span style={{ fontSize: 11, color: "#71717A" }}>
                {demoPaused
                  ? (lang === "hi" ? "होवर पर रुका हुआ" : lang === "mr" ? "होव्हरवर थांबवले" : "Paused — hover to pause, click tab to resume")
                  : (lang === "hi" ? "ऑटो-साइकल हो रहा है" : lang === "mr" ? "ऑटो-सायकल होत आहे" : "Auto-cycling every 2.8s")}
              </span>
            </div>
          </motion.div>

          <motion.div {...fadeUp} transition={{ delay: 0.15 }} style={{ flex: "1 1 300px" }}>
            {/* FIX 8: pause on hover */}
            <LanguageDemoCard activeLang={demoLang} onHover={setDemoPaused} />
            <div style={{ marginTop: 10, display: "flex", alignItems: "center", gap: 8, padding: "10px 14px", background: "white", border: "1px solid #E4E4E7", borderRadius: 12 }}>
              <div style={{ color: "#0D6B5E" }}><Icon.Volume /></div>
              <div>
                <div style={{ fontSize: 12, fontWeight: 600, color: "#09090B" }}>{lang === "hi" ? "आवाज़ में सुनें" : lang === "mr" ? "आवाजात ऐका" : "Listen in any language"}</div>
                <div style={{ fontSize: 10, color: "#A1A1AA" }}>Hindi, Marathi, English voice support</div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── REPORT CATEGORIES ───────────────────────────── */}
      <section style={{ padding: "100px 24px", background: "white", borderTop: "1px solid #E4E4E7" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <motion.div {...fadeUp} style={{ textAlign: "center", marginBottom: 52 }}>
            <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: "0.1em", color: "#0D6B5E", textTransform: "uppercase", marginBottom: 10 }}>
              {lang === "hi" ? "किन रिपोर्ट का विश्लेषण" : lang === "mr" ? "कोणत्या अहवालांचे विश्लेषण" : "What it analyzes"}
            </div>
            <h2 style={{ fontFamily: "Georgia, serif", fontSize: "clamp(26px, 4vw, 40px)", fontWeight: 700, color: "#09090B", lineHeight: 1.2 }}>
              {lang === "hi" ? "सभी प्रमुख रक्त परीक्षण पैनल" : lang === "mr" ? "सर्व प्रमुख रक्त चाचणी पॅनेल" : "All major blood test panels"}
            </h2>
          </motion.div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 16 }}>
            {reportCategories.map((cat, i) => (
              <motion.div
                key={i} {...fadeUp} transition={{ delay: i * 0.07 }}
                whileHover={{ y: -4, boxShadow: `0 12px 32px rgba(0,0,0,0.08), 0 0 0 1.5px ${cat.hoverBorder}` }}
                style={{ background: "white", border: "1px solid #E4E4E7", borderRadius: 16, padding: "20px 22px", cursor: "default", transition: "box-shadow 0.2s, border-color 0.2s" }}
              >
                {/* FIX 5: icon scales on hover */}
                <motion.div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }} whileHover="hovered">
                  <motion.div
                    variants={{ hovered: { scale: 1.12, rotate: 5 } }}
                    transition={{ duration: 0.2 }}
                    style={{ width: 36, height: 36, borderRadius: 10, background: cat.bg, display: "flex", alignItems: "center", justifyContent: "center" }}
                  >
                    <span style={{ fontSize: 11, fontWeight: 800, color: cat.color, letterSpacing: "-0.5px" }}>{cat.abbr}</span>
                  </motion.div>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: "#09090B" }}>{t(cat.name, lang)}</div>
                    <div style={{ fontSize: 10, color: "#A1A1AA" }}>{cat.markers.length - 1} values + more</div>
                  </div>
                </motion.div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
                  {cat.markers.map((m, j) => (
                    <span key={j} style={{ fontSize: 10, padding: "3px 8px", background: cat.bg, color: cat.color, borderRadius: 20, fontWeight: 600 }}>{m}</span>
                  ))}
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ────────────────────────────────── */}
      <section style={{ padding: "100px 24px", background: "#FAFAFA" }}>
        <div style={{ maxWidth: 680, margin: "0 auto" }}>
          <motion.div {...fadeUp} style={{ textAlign: "center", marginBottom: 56 }}>
            <h2 style={{ fontFamily: "Georgia, serif", fontSize: "clamp(26px, 4vw, 40px)", fontWeight: 700, color: "#09090B", lineHeight: 1.2 }}>
              {lang === "hi" ? "तीन सरल चरण" : lang === "mr" ? "तीन सोप्या पायऱ्या" : "Three simple steps"}
            </h2>
          </motion.div>

          <div style={{ position: "relative" }}>
            <div style={{ position: "absolute", left: 26, top: 28, bottom: 28, width: 1.5, background: "linear-gradient(to bottom, #A7F3D0, #A7F3D0 33%, #FDE68A 33%, #FDE68A 66%, #A7F3D0 66%)" }} />
            {steps.map((s, i) => (
              <motion.div key={i} {...fadeUp} transition={{ delay: i * 0.15 }} style={{ display: "flex", gap: 28, padding: "28px 0", position: "relative" }}>
                <div style={{ width: 54, height: 54, borderRadius: 16, background: "#0D6B5E", border: "4px solid #FAFAFA", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, fontFamily: "Georgia, serif", fontSize: 16, fontWeight: 700, color: "white", boxShadow: "0 4px 14px rgba(13,107,94,0.2)", position: "relative", zIndex: 1 }}>
                  {s.n}
                </div>
                <div style={{ paddingTop: 6 }}>
                  <div style={{ fontSize: 19, fontWeight: 700, color: "#09090B", marginBottom: 6 }}>
                    {lang === "hi" ? s.hi : lang === "mr" ? s.mr : s.en}
                  </div>
                  <div style={{ fontSize: 14, color: "#52525B", lineHeight: 1.6, marginBottom: 6 }}>{t(s.sub, lang)}</div>
                  {/* FIX 6: translated tech detail */}
                  <div style={{ fontSize: 11, color: "#A1A1AA", fontFamily: "monospace" }}>{t(s.detail, lang)}</div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── BOTTOM CTA ───────────────────────────────────── */}
      <section style={{ padding: "80px 24px", background: "#FAFAFA" }}>
        <motion.div
          {...fadeUp}
          style={{ maxWidth: 820, margin: "0 auto", background: "linear-gradient(135deg, #064E3B 0%, #0D6B5E 60%, #0F766E 100%)", borderRadius: 28, padding: "56px 48px", position: "relative", overflow: "hidden" }}
        >
          <div style={{ position: "absolute", width: 320, height: 320, borderRadius: "50%", border: "1px solid rgba(255,255,255,0.06)", top: -100, right: -80 }} />
          <div style={{ position: "absolute", width: 200, height: 200, borderRadius: "50%", border: "1px solid rgba(255,255,255,0.04)", bottom: -60, left: -40 }} />

          <div style={{ position: "relative", zIndex: 1, textAlign: "center" }}>
            <div style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.15)", borderRadius: 20, padding: "5px 14px", marginBottom: 24, fontSize: 12, color: "rgba(255,255,255,0.75)", fontWeight: 600 }}>
              <Icon.Heart />
              {lang === "hi" ? "मुफ़्त · कोई लॉगिन नहीं · 100% गोपनीय" : lang === "mr" ? "मोफत · लॉगिन नाही · 100% गोपनीय" : "Free · No login · 100% Private"}
            </div>

            <h2 style={{ fontFamily: "Georgia, serif", fontSize: "clamp(28px, 4vw, 46px)", fontWeight: 700, color: "white", lineHeight: 1.15, marginBottom: 16 }}>
              {lang === "hi" ? "अपनी रिपोर्ट को स्पष्टता में बदलें" : lang === "mr" ? "तुमचा अहवाल स्पष्टतेत बदला" : "Turn medical confusion\ninto clarity."}
            </h2>
            <p style={{ fontSize: 16, color: "rgba(255,255,255,0.65)", maxWidth: 420, margin: "0 auto 36px" }}>
              {lang === "hi" ? "आपके परिवार के हर सदस्य की रिपोर्ट — एक ही जगह, उनकी भाषा में।" : lang === "mr" ? "तुमच्या कुटुंबातील प्रत्येक सदस्याचा अहवाल — एकाच ठिकाणी, त्यांच्या भाषेत." : "For you, your parents, your family — in the language each person understands."}
            </p>

            {/* FIX 9: button has its own entrance spring + shimmer */}
            <motion.button
              onClick={onStart}
              initial={{ opacity: 0, y: 16, scale: 0.95 }}
              whileInView={{ opacity: 1, y: 0, scale: 1 }}
              viewport={{ once: true }}
              transition={{ delay: 0.3, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
              whileHover={{ scale: 1.04, boxShadow: "0 12px 32px rgba(0,0,0,0.18)" }}
              whileTap={{ scale: 0.97 }}
              className="shimmer-btn-white"
              style={{ background: "white", color: "#064E3B", border: "none", borderRadius: 14, padding: "16px 40px", fontSize: 16, fontWeight: 700, cursor: "pointer", boxShadow: "0 8px 24px rgba(0,0,0,0.12)", display: "inline-flex", alignItems: "center", gap: 8, position: "relative", overflow: "hidden" }}
            >
              {lang === "hi" ? "रिपोर्ट अपलोड करें" : lang === "mr" ? "अहवाल अपलोड करा" : "Analyze My Report"}
              <Icon.Arrow />
            </motion.button>
          </div>
        </motion.div>
      </section>

      {/* ── FOOTER ──────────────────────────────────────── */}
      <footer style={{ borderTop: "1px solid #E4E4E7", background: "white", padding: "28px 24px" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto", display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ width: 28, height: 28, borderRadius: 9, background: "#0D6B5E", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <svg width="16" height="11" viewBox="0 0 24 16" fill="none"><polyline points="0,8 4,8 6,2 9,14 12,0 15,10 17,8 24,8" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </div>
            <span style={{ fontFamily: "Georgia, serif", fontWeight: 700, color: "#09090B", fontSize: 15 }}>Bodh</span>
            <span style={{ color: "#D4D4D8", fontSize: 12 }}>·</span>
            <span style={{ color: "#A1A1AA", fontSize: 11 }}>बोध · awareness</span>
          </div>
          {/* FIX 10: 12px font, better contrast */}
          <p style={{ fontSize: 12, color: "#71717A", maxWidth: 500, textAlign: "center", lineHeight: 1.6 }}>
            ⚕️ Bodh is an AI-powered health literacy tool for educational purposes only. It is not a substitute for professional medical advice, diagnosis, or treatment. Always consult a qualified physician.
          </p>
        </div>
      </footer>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }

        /* FIX 4: shimmer animation on primary CTA */
        @keyframes shimmer {
          0% { transform: translateX(-100%) skewX(-15deg); }
          100% { transform: translateX(250%) skewX(-15deg); }
        }
        .shimmer-btn::after {
          content: '';
          position: absolute;
          top: 0; left: 0; right: 0; bottom: 0;
          background: linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.18) 50%, transparent 100%);
          transform: translateX(-100%) skewX(-15deg);
          animation: shimmer 3s infinite 1.5s;
        }
        .shimmer-btn-white::after {
          content: '';
          position: absolute;
          top: 0; left: 0; right: 0; bottom: 0;
          background: linear-gradient(90deg, transparent 0%, rgba(13,107,94,0.08) 50%, transparent 100%);
          transform: translateX(-100%) skewX(-15deg);
          animation: shimmer 3s infinite 2s;
        }

        /* FIX 2: privacy pipeline responsive */
        .privacy-pipeline {
          display: flex;
          align-items: flex-start;
          gap: 0;
          flex-wrap: wrap;
          position: relative;
        }
        .privacy-step {
          flex: 1 1 180px;
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          position: relative;
        }
        .privacy-connector {
          position: absolute;
          top: 28px;
          left: calc(50% + 24px);
          right: calc(-50% + 24px);
          height: 1px;
          background: linear-gradient(to right, #A7F3D0, #A7F3D0);
          z-index: 0;
        }
        @media (max-width: 640px) {
          .privacy-pipeline {
            flex-direction: column;
            align-items: flex-start;
            gap: 32px;
            padding-left: 28px;
          }
          .privacy-step {
            flex-direction: row;
            text-align: left;
            gap: 16px;
            align-items: flex-start;
          }
          .privacy-step > div:last-child {
            max-width: 100% !important;
          }
          /* Vertical connector on mobile */
          .privacy-connector {
            top: calc(100% + 0px);
            left: 27px;
            right: auto;
            width: 1px;
            height: 32px;
            background: #A7F3D0;
          }
        }
      `}</style>
    </div>
  );
}