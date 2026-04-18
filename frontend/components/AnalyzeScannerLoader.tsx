"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState } from "react";
import {
  Check,
  Dna,
  Lightbulb,
  Loader2,
  Pill,
  Scale3d,
  Search,
  Sparkles,
} from "lucide-react";
import { useApp } from "@/context/AppContext";
import { STAGES, t } from "@/lib/constants";

// ─── Personalised tip messages shown while waiting ───────────────────────────
const TIPS = {
  en: [
    "Haemoglobin below 12 g/dL often signals anaemia — we'll flag that for you.",
    "Most Indian labs use ICMR reference ranges — our engine is calibrated for those.",
    "We cross-check every value against age & gender-specific norms.",
    "Your report is never stored — it's processed in memory and discarded.",
    "Vitamin D deficiency affects ~70 % of urban Indians — we'll check yours.",
    "HbA1c above 6.5 % is a key diabetes marker — we look for it automatically.",
  ],
  hi: [
    "हीमोग्लोबिन 12 g/dL से कम अक्सर एनीमिया का संकेत है — हम इसे हाइलाइट करेंगे।",
    "अधिकांश भारतीय लैब ICMR मानकों का उपयोग करते हैं — हमारा इंजन उनके अनुसार तैयार है।",
    "हम आपकी उम्र और लिंग के अनुसार हर मान की जाँच करते हैं।",
    "आपकी रिपोर्ट कभी सहेजी नहीं जाती — यह मेमोरी में प्रोसेस होकर हटा दी जाती है।",
    "विटामिन D की कमी शहरी भारतीयों में ~70% है — हम इसे देखेंगे।",
  ],
  mr: [
    "हिमोग्लोबिन 12 g/dL पेक्षा कमी असल्यास अॅनिमियाचे संकेत असू शकतात.",
    "बहुतेक भारतीय लॅब ICMR मानके वापरतात — आमचे इंजिन त्यानुसार तयार आहे.",
    "आम्ही वय व लिंगानुसार प्रत्येक मूल्य तपासतो.",
    "तुमचा अहवाल कधीही साठवला जात नाही — प्रक्रियेनंतर तो हटवला जातो.",
    "व्हिटॅमिन D ची कमतरता शहरी भारतीयांमध्ये ~70% आहे.",
  ],
};

const STAGE_ICON_COMPONENTS = [Search, Dna, Scale3d, Pill, Sparkles] as const;

const STAGE_SUBTITLES = {
  en: [
    "Reading your document…",
    "Identifying biomarkers…",
    "Comparing with normal ranges…",
    "Checking for deficiencies…",
    "Writing your summary…",
  ],
  hi: [
    "आपका दस्तावेज़ पढ़ा जा रहा है…",
    "बायोमार्कर पहचाने जा रहे हैं…",
    "सामान्य सीमाओं से तुलना…",
    "कमियों की जाँच…",
    "सारांश तैयार हो रहा है…",
  ],
  mr: [
    "तुमचा दस्तऐवज वाचत आहे…",
    "बायोमार्कर ओळखत आहे…",
    "सामान्य मर्यादांशी तुलना…",
    "कमतरता तपासत आहे…",
    "सारांश तयार होत आहे…",
  ],
};

const COPY = {
  title: {
    en: "Analyzing your report",
    hi: "आपकी रिपोर्ट का विश्लेषण",
    mr: "तुमच्या अहवालाचे विश्लेषण",
  },
  didYouKnow: { en: "While you wait", hi: "इंतज़ार के दौरान", mr: "वाट पाहताना" },
};

function tx(obj: { en: string; hi: string; mr: string }, lang: "en" | "hi" | "mr") {
  return lang === "hi" ? obj.hi : lang === "mr" ? obj.mr : obj.en;
}

// ─── Pulsing orb with rotating ring ─────────────────────────────────────────
function ScanOrb({ stage, total }: { stage: number; total: number }) {
  const pct = Math.min(100, ((stage + 1) / total) * 100);
  const r = 44;
  const circ = 2 * Math.PI * r;
  const dash = (pct / 100) * circ;

  return (
    <div className="relative mx-auto mb-8 flex h-32 w-32 items-center justify-center">
      {/* outer slow-spin ring */}
      <motion.div
        className="absolute inset-0 rounded-full"
        style={{
          background:
            "conic-gradient(from 0deg, #A7F3D0 0%, #0D6B5E 40%, transparent 60%)",
          opacity: 0.25,
        }}
        animate={{ rotate: 360 }}
        transition={{ duration: 6, repeat: Infinity, ease: "linear" }}
      />

      {/* SVG arc progress */}
      <svg className="absolute inset-0" width="128" height="128" viewBox="0 0 128 128">
        <circle cx="64" cy="64" r={r} fill="none" stroke="#E4E4E7" strokeWidth="5" />
        <motion.circle
          cx="64"
          cy="64"
          r={r}
          fill="none"
          stroke="url(#arcGrad)"
          strokeWidth="5"
          strokeLinecap="round"
          strokeDasharray={circ}
          initial={{ strokeDashoffset: circ }}
          animate={{ strokeDashoffset: circ - dash }}
          transition={{ duration: 0.7, ease: "easeOut" }}
          transform="rotate(-90 64 64)"
        />
        <defs>
          <linearGradient id="arcGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#064E3B" />
            <stop offset="100%" stopColor="#34D399" />
          </linearGradient>
        </defs>
      </svg>

      {/* inner pulsing circle */}
      <motion.div
        className="relative z-10 flex h-20 w-20 items-center justify-center rounded-full"
        style={{ background: "linear-gradient(135deg, #ECFDF5, #D1FAE5)" }}
        animate={{ scale: [1, 1.06, 1] }}
        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={stage}
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.4 }}
            transition={{ duration: 0.3 }}
            className="flex items-center justify-center text-[#0D6B5E]"
          >
            {(() => {
              const Icon = STAGE_ICON_COMPONENTS[Math.min(stage, STAGE_ICON_COMPONENTS.length - 1)];
              return <Icon size={28} strokeWidth={2} aria-hidden />;
            })()}
          </motion.div>
        </AnimatePresence>
      </motion.div>

      {/* floating dots */}
      {[0, 1, 2].map((i) => (
        <motion.div
          key={i}
          className="absolute h-2 w-2 rounded-full"
          style={{
            background: "#0D6B5E",
            top: "50%",
            left: "50%",
            marginTop: -4,
            marginLeft: -4,
          }}
          animate={{
            x: Math.cos((i / 3) * 2 * Math.PI) * 58,
            y: Math.sin((i / 3) * 2 * Math.PI) * 58,
            opacity: [0.2, 0.8, 0.2],
            scale: [0.7, 1.2, 0.7],
          }}
          transition={{
            duration: 3,
            repeat: Infinity,
            delay: i * 1,
            ease: "easeInOut",
          }}
        />
      ))}
    </div>
  );
}

// ─── Stage row ────────────────────────────────────────────────────────────────
function StageRow({
  label,
  index,
  stage,
  elderly,
}: {
  label: string;
  index: number;
  stage: number;
  elderly: boolean;
}) {
  const done = index < stage;
  const active = index === stage;
  const pending = index > stage;

  return (
    <motion.div
      initial={{ opacity: 0, x: -16 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.07, duration: 0.35 }}
      className={`flex items-center gap-3 rounded-xl px-3 py-2.5 transition-colors ${
        active ? "bg-[#ECFDF5]" : ""
      }`}
    >
      {/* indicator */}
      <div className="relative flex h-6 w-6 shrink-0 items-center justify-center">
        {done && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="flex h-6 w-6 items-center justify-center rounded-full text-white"
            style={{ background: "#064E3B" }}
          >
            <Check size={14} strokeWidth={2.5} aria-hidden />
          </motion.div>
        )}
        {active && (
          <motion.div
            className="h-6 w-6 rounded-full border-2"
            style={{ borderColor: "#0D6B5E" }}
            animate={{ scale: [1, 1.15, 1] }}
            transition={{ duration: 1.2, repeat: Infinity }}
          >
            <motion.div
              className="m-auto mt-1 h-2.5 w-2.5 rounded-full"
              style={{ background: "#0D6B5E" }}
              animate={{ opacity: [1, 0.3, 1] }}
              transition={{ duration: 1.2, repeat: Infinity }}
            />
          </motion.div>
        )}
        {pending && (
          <div
            className="h-6 w-6 rounded-full border-2"
            style={{ borderColor: "#E4E4E7" }}
          />
        )}
      </div>

      <span
        className={`${elderly ? "text-base" : "text-sm"} ${
          done ? "text-[#064E3B]" : active ? "font-semibold text-[#09090B]" : "text-[#A1A1AA]"
        }`}
      >
        {label}
      </span>

      {active && (
        <motion.div
          className="ml-auto text-[#0D6B5E]"
          animate={{ opacity: [1, 0.45, 1] }}
          transition={{ duration: 1.2, repeat: Infinity }}
          aria-hidden
        >
          <Loader2 size={16} strokeWidth={2.5} className="animate-spin" />
        </motion.div>
      )}
    </motion.div>
  );
}

// ─── Rotating tip card ────────────────────────────────────────────────────────
function TipTicker({ lang, elderly }: { lang: "en" | "hi" | "mr"; elderly: boolean }) {
  const tips = TIPS[lang];
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setIdx((p) => (p + 1) % tips.length), 4000);
    return () => clearInterval(id);
  }, [tips.length]);

  return (
    <div
      className="mt-6 overflow-hidden rounded-2xl border px-4 py-3"
      style={{ background: "#F0FDF4", borderColor: "#A7F3D0" }}
    >
      <p className="mb-1.5 text-xs font-bold uppercase tracking-wider text-[#065F46]">
        {tx(COPY.didYouKnow, lang)}
      </p>
      <AnimatePresence mode="wait">
        <motion.div
          key={idx}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.4 }}
          className={`flex gap-3 text-[#065F46] ${elderly ? "text-base" : "text-sm"} leading-relaxed`}
        >
          <Lightbulb size={20} strokeWidth={2} className="mt-0.5 shrink-0 text-[#0D6B5E]" aria-hidden />
          <p>{tips[idx]}</p>
        </motion.div>
      </AnimatePresence>

      {/* dot indicators */}
      <div className="mt-2.5 flex gap-1.5">
        {tips.map((_, i) => (
          <motion.div
            key={i}
            className="h-1 rounded-full"
            animate={{ width: i === idx ? 16 : 4, background: i === idx ? "#0D6B5E" : "#A7F3D0" }}
            transition={{ duration: 0.3 }}
          />
        ))}
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
interface AnalyzeScannerLoaderProps {
  stage: number;
}

export default function AnalyzeScannerLoader({ stage }: AnalyzeScannerLoaderProps) {
  const { lang, elderly } = useApp();
  const subtitles = STAGE_SUBTITLES[lang];

  return (
    <div
      className="flex min-h-[calc(100vh-8rem)] flex-col items-center justify-center px-6 py-12"
      style={{
        background: "radial-gradient(circle at 50% 20%, #E6F7F4, #FAFAFA 60%)",
      }}
    >
      <motion.div
        initial={{ opacity: 0, y: 24, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="w-full max-w-md"
      >
        {/* Header */}
        <div className="mb-6 text-center">
          <motion.h2
            className="text-2xl font-extrabold tracking-tight text-[#09090B]"
            style={{ fontFamily: "Georgia, serif" }}
          >
            {tx(COPY.title, lang)}
          </motion.h2>
          <AnimatePresence mode="wait">
            <motion.p
              key={stage}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.35 }}
              className={`mt-1 ${elderly ? "text-base" : "text-sm"} text-[#71717A]`}
            >
              {subtitles[stage] ?? subtitles[0]}
            </motion.p>
          </AnimatePresence>
        </div>

        {/* Orb */}
        <ScanOrb stage={stage} total={STAGES.length} />

        {/* Stage list card */}
        <div
          className="rounded-2xl border bg-white px-4 py-4 shadow-lg"
          style={{ borderColor: "#E4E4E7", boxShadow: "0 20px 50px rgba(13,107,94,0.08)" }}
        >
          <div className="space-y-1">
            {STAGES.map((s, i) => (
              <StageRow
                key={s.en}
                label={t(s, lang)}
                index={i}
                stage={stage}
                elderly={elderly}
              />
            ))}
          </div>

          {/* Progress bar */}
          <div className="mx-3 mt-4 h-1.5 overflow-hidden rounded-full bg-[#F4F4F5]">
            <motion.div
              className="h-full rounded-full"
              style={{ background: "linear-gradient(90deg, #064E3B, #34D399)" }}
              initial={{ width: "0%" }}
              animate={{ width: `${Math.min(100, ((stage + 1) / STAGES.length) * 100)}%` }}
              transition={{ duration: 0.6, ease: "easeOut" }}
            />
          </div>
          <p className="mt-2 text-right text-xs font-semibold text-[#0D6B5E]">
            {Math.round(Math.min(100, ((stage + 1) / STAGES.length) * 100))}%
          </p>
        </div>

        {/* Tip ticker */}
        <TipTicker lang={lang} elderly={elderly} />
      </motion.div>
    </div>
  );
}