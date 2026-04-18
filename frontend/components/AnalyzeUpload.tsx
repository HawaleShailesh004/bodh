"use client";

import { useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { Lang } from "@/lib/types";

const Icons = {
  Upload: () => (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="17 8 12 3 7 8" />
      <line x1="12" y1="3" x2="12" y2="15" />
    </svg>
  ),
  Camera: () => (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
      <circle cx="12" cy="13" r="4" />
    </svg>
  ),
  Shield: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  ),
  Trash: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    </svg>
  ),
  CheckCircle: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
      <polyline points="22 4 12 14.01 9 11.01" />
    </svg>
  ),
  File: () => (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
    </svg>
  ),
  X: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  ),
  Lock: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  ),
};

const COPY = {
  chip: {
    en: "ICMR Verified · Built for India",
    hi: "ICMR सत्यापित · भारत के लिए निर्मित",
    mr: "ICMR सत्यापित · भारतासाठी बनवलेले",
  },
  title: {
    en: "Upload your lab report",
    hi: "अपनी लैब रिपोर्ट अपलोड करें",
    mr: "तुमचा लॅब अहवाल अपलोड करा",
  },
  subtitle: {
    en: "PDF or clear photo — any Indian lab format. We strip personal details before analysis.",
    hi: "PDF या साफ़ फोटो — कोई भी भारतीय लैब। विश्लेषण से पहले व्यक्तिगत विवरण हटा दिए जाते हैं।",
    mr: "PDF किंवा स्पष्ट फोटो — कोणतीही भारतीय लॅब. विश्लेषणापूर्वी वैयक्तिक तपशील काढले जातात.",
  },
  age: { en: "Age", hi: "उम्र", mr: "वय" },
  gender: { en: "Gender", hi: "लिंग", mr: "लिंग" },
  male: { en: "Male", hi: "पुरुष", mr: "पुरुष" },
  female: { en: "Female", hi: "महिला", mr: "स्त्री" },
  dropTitle: {
    en: "Drop your file here",
    hi: "फ़ाइल यहाँ छोड़ें",
    mr: "फाइल येथे सोडा",
  },
  dropHint: {
    en: "or tap to browse · PDF, JPG, PNG, WebP",
    hi: "या ब्राउज़ करने के लिए टैप करें",
    mr: "किंवा ब्राउझ करण्यासाठी टॅप करा",
  },
  dragActive: {
    en: "Release to upload",
    hi: "अपलोड करने के लिए छोड़ें",
    mr: "अपलोड करण्यासाठी सोडा",
  },
  analyzeCta: {
    en: "Analyze Report",
    hi: "रिपोर्ट विश्लेषण करें",
    mr: "अहवाल विश्लेषण करा",
  },
  analyzeCtaFile: {
    en: "Analyze this report",
    hi: "इस रिपोर्ट का विश्लेषण करें",
    mr: "हा अहवाल विश्लेषण करा",
  },
  chooseFile: {
    en: "Choose file",
    hi: "फ़ाइल चुनें",
    mr: "फाइल निवडा",
  },
  camera: {
    en: "Take a photo instead",
    hi: "फोटो लें",
    mr: "फोटो काढा",
  },
  noStore: {
    en: "No data stored",
    hi: "डेटा सहेजा नहीं",
    mr: "डेटा साठवला नाही",
  },
  pii: {
    en: "PII removed",
    hi: "व्यक्तिगत जानकारी हटाई",
    mr: "वैयक्तिक माहिती काढली",
  },
  encrypted: {
    en: "256-bit encrypted",
    hi: "256-बिट एन्क्रिप्टेड",
    mr: "256-बिट एनक्रिप्टेड",
  },
  selectedFile: {
    en: "Selected file",
    hi: "चुनी गई फ़ाइल",
    mr: "निवडलेली फाइल",
  },
  changeFile: {
    en: "Change",
    hi: "बदलें",
    mr: "बदला",
  },
};

function tx<K extends keyof typeof COPY>(key: K, lang: Lang): string {
  const o = COPY[key];
  return lang === "hi" ? o.hi : lang === "mr" ? o.mr : o.en;
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// ─── Floating upload icon ────────────────────────────────────────────────────
function FloatingUploadIcon() {
  return (
    <div className="relative mx-auto mb-4 flex h-16 w-16 items-center justify-center">
      {/* ripple rings */}
      {[0, 1].map((i) => (
        <motion.div
          key={i}
          className="absolute inset-0 rounded-2xl"
          style={{ border: "1.5px solid #0D6B5E", opacity: 0 }}
          animate={{ scale: [1, 1.6], opacity: [0.4, 0] }}
          transition={{ duration: 2, repeat: Infinity, delay: i * 1, ease: "easeOut" }}
        />
      ))}
      <motion.div
        className="relative z-10 flex h-16 w-16 items-center justify-center rounded-2xl"
        style={{ background: "linear-gradient(135deg, #ECFDF5, #D1FAE5)", color: "#0D6B5E" }}
        animate={{ y: [0, -4, 0] }}
        transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
      >
        <Icons.Upload />
      </motion.div>
    </div>
  );
}

// ─── File preview pill ────────────────────────────────────────────────────────
function FilePreview({
  file,
  lang,
  elderly,
  onClear,
}: {
  file: File;
  lang: Lang;
  elderly: boolean;
  onClear: () => void;
}) {
  const isImage = file.type.startsWith("image/");
  const [thumb, setThumb] = useState<string | null>(null);

  // Generate thumbnail for images
  if (isImage && !thumb) {
    const reader = new FileReader();
    reader.onload = (e) => setThumb(e.target?.result as string);
    reader.readAsDataURL(file);
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -8, scale: 0.97 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className="flex items-center gap-3 rounded-2xl border p-3"
      style={{
        background: "#F0FDF4",
        borderColor: "#A7F3D0",
        boxShadow: "0 4px 16px rgba(13,107,94,0.08)",
      }}
    >
      {/* thumb or file icon */}
      <div
        className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl"
        style={{ background: "#ECFDF5", color: "#0D6B5E" }}
      >
        {thumb ? (
          <img src={thumb} alt="" className="h-full w-full object-cover" />
        ) : (
          <Icons.File />
        )}
      </div>

      <div className="min-w-0 flex-1">
        <p
          className={`truncate font-semibold text-[#064E3B] ${elderly ? "text-base" : "text-sm"}`}
        >
          {file.name}
        </p>
        <p className="text-xs text-[#6EE7B7]">
          {tx("selectedFile", lang)} · {formatBytes(file.size)}
        </p>
      </div>

      <button
        type="button"
        onClick={onClear}
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition hover:bg-[#D1FAE5]"
        style={{ color: "#065F46" }}
      >
        <Icons.X />
      </button>
    </motion.div>
  );
}

interface AnalyzeUploadProps {
  lang: Lang;
  elderly?: boolean;
  age: number;
  setAge: (n: number) => void;
  gender: "male" | "female";
  setGender: (g: "male" | "female") => void;
  error: string | null;
  onFile: (file: File) => void;
}

export default function AnalyzeUpload({
  lang,
  elderly = false,
  age,
  setAge,
  gender,
  setGender,
  error,
  onFile,
}: AnalyzeUploadProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  const [drag, setDrag] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  function handleFile(f: File) {
    setSelectedFile(f);
  }

  // Staggered child animation config
  const container = {
    hidden: {},
    show: { transition: { staggerChildren: 0.07 } },
  };
  const item = {
    hidden: { opacity: 0, y: 16 },
    show: { opacity: 1, y: 0 },
  };

  return (
    <div className="w-full flex-1 bg-[#FAFAFA]">
      <div
        className="px-6 pb-16 pt-10"
        style={{
          background: "radial-gradient(circle at top right, #E6F7F4, #FAFAFA 55%)",
        }}
      >
        <div className="mx-auto w-full max-w-[560px]">
          <motion.div variants={container} initial="hidden" animate="show">

            {/* Chip */}
            <motion.div variants={item}>
              <motion.div
                className="mb-6 inline-flex items-center gap-2 rounded-full border px-4 py-2"
                style={{
                  background: "#ECFDF5",
                  borderColor: "#A7F3D0",
                  fontSize: 13,
                  color: "#065F46",
                  fontWeight: 600,
                }}
                whileHover={{ scale: 1.03 }}
              >
                <Icons.CheckCircle />
                {tx("chip", lang)}
              </motion.div>
            </motion.div>

            {/* Title */}
            <motion.h1
              variants={item}
              className="mb-3 text-[clamp(1.75rem,4vw,2.35rem)] font-extrabold leading-tight tracking-tight text-[#09090B]"
              style={{ fontFamily: "Georgia, serif" }}
            >
              {tx("title", lang)}
            </motion.h1>

            <motion.p
              variants={item}
              className={`mb-8 leading-relaxed text-[#52525B] ${elderly ? "text-lg" : "text-base"}`}
            >
              {tx("subtitle", lang)}
            </motion.p>

            {/* Age + Gender */}
            <motion.div variants={item} className="mb-6 grid grid-cols-2 gap-4">
              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-[#71717A]">
                  {tx("age", lang)}
                </label>
                <input
                  type="number"
                  min={1}
                  max={120}
                  value={age}
                  onChange={(e) => setAge(Number(e.target.value))}
                  className="w-full rounded-2xl border border-[#E4E4E7] bg-white px-4 py-3.5 text-[#09090B] shadow-sm outline-none transition focus:border-[#0D6B5E] focus:ring-2 focus:ring-[#0D6B5E]/20"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-[#71717A]">
                  {tx("gender", lang)}
                </label>
                <div className="flex gap-2 rounded-2xl border border-[#E4E4E7] bg-[#F4F4F5] p-1">
                  {(["male", "female"] as const).map((g) => (
                    <button
                      key={g}
                      type="button"
                      onClick={() => setGender(g)}
                      className="flex-1 rounded-xl py-3 text-sm font-semibold transition-all"
                      style={{
                        background: gender === g ? "#fff" : "transparent",
                        color: gender === g ? "#064E3B" : "#71717A",
                        boxShadow: gender === g ? "0 2px 8px rgba(0,0,0,0.06)" : "none",
                      }}
                    >
                      {tx(g === "male" ? "male" : "female", lang)}
                    </button>
                  ))}
                </div>
              </div>
            </motion.div>

            {/* Drop zone — hidden once file selected */}
            <motion.div variants={item}>
              <AnimatePresence mode="wait">
                {selectedFile ? (
                  <FilePreview
                    key="preview"
                    file={selectedFile}
                    lang={lang}
                    elderly={elderly}
                    onClear={() => {
                      setSelectedFile(null);
                      if (fileRef.current) fileRef.current.value = "";
                    }}
                  />
                ) : (
                  <motion.div
                    key="dropzone"
                    role="button"
                    tabIndex={0}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0, scale: 0.97 }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        fileRef.current?.click();
                      }
                    }}
                    onClick={() => fileRef.current?.click()}
                    onDrop={(e) => {
                      e.preventDefault();
                      setDrag(false);
                      const f = e.dataTransfer.files?.[0];
                      if (f) handleFile(f);
                    }}
                    onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
                    onDragLeave={() => setDrag(false)}
                    whileTap={{ scale: 0.995 }}
                    className="cursor-pointer rounded-2xl border-2 border-dashed bg-white p-10 text-center transition-all"
                    style={{
                      borderColor: drag ? "#0D6B5E" : "#E4E4E7",
                      background: drag ? "#F0FDF4" : "#fff",
                      boxShadow: drag
                        ? "0 8px 32px rgba(13,107,94,0.14), inset 0 0 0 4px rgba(13,107,94,0.04)"
                        : "0 4px 20px rgba(0,0,0,0.04)",
                    }}
                  >
                    {drag ? (
                      <motion.div
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        className="py-2"
                      >
                        <div className="mx-auto mb-3 text-4xl">📂</div>
                        <div className="text-lg font-bold text-[#0D6B5E]">{tx("dragActive", lang)}</div>
                      </motion.div>
                    ) : (
                      <>
                        <FloatingUploadIcon />
                        <div className="mb-1 text-lg font-bold text-[#09090B]">{tx("dropTitle", lang)}</div>
                        <div className="text-sm text-[#71717A]">{tx("dropHint", lang)}</div>
                      </>
                    )}
                    <input
                      ref={fileRef}
                      type="file"
                      accept=".pdf,image/*"
                      className="hidden"
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) handleFile(f);
                      }}
                    />
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>

            {/* Primary CTA */}
            <motion.div variants={item}>
              <motion.button
                type="button"
                onClick={() => selectedFile ? onFile(selectedFile) : fileRef.current?.click()}
                whileHover={{ scale: 1.02, boxShadow: "0 12px 36px rgba(13,107,94,0.36)" }}
                whileTap={{ scale: 0.98 }}
                className={`mt-4 w-full rounded-2xl py-4 font-bold text-white ${elderly ? "text-lg" : "text-base"}`}
                style={{
                  background: selectedFile
                    ? "linear-gradient(135deg, #064E3B, #0D6B5E)"
                    : "#0D6B5E",
                  boxShadow: "0 8px 28px rgba(13,107,94,0.28)",
                  transition: "background 0.3s",
                }}
              >
                <span className="flex items-center justify-center gap-2">
                  {selectedFile ? (
                    <>
                      <motion.span
                        animate={{ scale: [1, 1.2, 1] }}
                        transition={{ duration: 0.6, repeat: Infinity, repeatDelay: 2 }}
                      >
                        ✨
                      </motion.span>
                      {tx("analyzeCtaFile", lang)}
                    </>
                  ) : (
                    tx("analyzeCta", lang)
                  )}
                </span>
              </motion.button>
            </motion.div>

            {/* Camera button */}
            <motion.div variants={item}>
              <motion.button
                type="button"
                onClick={() => cameraRef.current?.click()}
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
                className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-[#E4E4E7] bg-white py-3.5 text-base font-semibold text-[#09090B] shadow-sm transition hover:border-[#0D6B5E] hover:text-[#0D6B5E]"
              >
                <Icons.Camera />
                {tx("camera", lang)}
              </motion.button>
              <input
                ref={cameraRef}
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleFile(f);
                }}
              />
            </motion.div>

            {/* Trust badges */}
            <motion.div
              variants={item}
              className="mt-8 flex flex-wrap gap-6 text-sm font-medium text-[#71717A]"
            >
              {[
                { icon: <Icons.Shield />, label: tx("noStore", lang) },
                { icon: <Icons.Trash />, label: tx("pii", lang) },
                { icon: <Icons.Lock />, label: tx("encrypted", lang) },
              ].map(({ icon, label }) => (
                <motion.span
                  key={label}
                  className="inline-flex items-center gap-1.5"
                  whileHover={{ color: "#0D6B5E", x: 2 }}
                  transition={{ duration: 0.15 }}
                >
                  {icon} {label}
                </motion.span>
              ))}
            </motion.div>

            {/* Error */}
            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: 6, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -6 }}
                  className="mt-6 rounded-2xl border px-4 py-3 text-sm"
                  style={{
                    background: "#FEF2F2",
                    borderColor: "#FECACA",
                    color: "#991B1B",
                  }}
                >
                  ⚠ {error}
                </motion.div>
              )}
            </AnimatePresence>

          </motion.div>
        </div>
      </div>
    </div>
  );
}