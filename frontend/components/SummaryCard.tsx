"use client";

import { useState, useEffect } from "react";
import { Volume2, VolumeX, Share2, Copy, Check } from "lucide-react";
import type { AnalysisResult, Lang } from "@/lib/types";
import { SEV } from "@/lib/constants";

interface SummaryCardProps {
  result: AnalysisResult;
  lang: Lang;
  elderly?: boolean;
}

export default function SummaryCard({ result, lang, elderly = false }: SummaryCardProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [copied, setCopied]       = useState(false);
  const [activeLang, setActiveLang] = useState<Lang>(lang);

  useEffect(() => {
    setActiveLang(lang);
    if (isPlaying) { speechSynthesis.cancel(); setIsPlaying(false); }
  }, [lang]);

  // Use AI-generated summary from backend, fall back to empty string gracefully
  const summary = (() => {
    if (activeLang === "hi" && result.report_summary_hi) return result.report_summary_hi;
    if (activeLang === "mr" && result.report_summary_mr) return result.report_summary_mr;
    if (result.report_summary_en) return result.report_summary_en;
    return "Summary not available.";
  })();

  const handleListen = () => {
    if (typeof window === "undefined") return;
    if (isPlaying) { speechSynthesis.cancel(); setIsPlaying(false); return; }
    const utter = new SpeechSynthesisUtterance(summary);
    utter.lang  = activeLang === "hi" ? "hi-IN" : activeLang === "mr" ? "mr-IN" : "en-IN";
    utter.rate  = elderly ? 0.7 : 0.85;
    utter.onend  = () => setIsPlaying(false);
    utter.onerror = () => setIsPlaying(false);
    setIsPlaying(true);
    speechSynthesis.speak(utter);
  };

  const handleShare = () => {
    const text = `Bodh Health Summary\n\n${summary}\n\nAlways consult a doctor.`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
  };

  const handleCopy = async () => {
    await navigator.clipboard.writeText(summary);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const cfg = SEV[result.overall_severity];

  const LABELS = {
    title:   { en: "Report Summary", hi: "रिपोर्ट सारांश", mr: "अहवाल सारांश" },
    listen:  { en: "Listen", hi: "सुनें", mr: "ऐका" },
    stop:    { en: "Stop", hi: "रोकें", mr: "थांबवा" },
    copy:    { en: "Copy", hi: "कॉपी", mr: "कॉपी" },
    copied:  { en: "Copied!", hi: "कॉपी!", mr: "कॉपी!" },
    share:   { en: "Share", hi: "शेयर", mr: "शेअर" },
  };
  const l = (key: keyof typeof LABELS) => LABELS[key][activeLang];

  return (
    <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg" style={{ background: cfg.bg }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={cfg.color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
              <polyline points="14 2 14 8 20 8"/>
              <line x1="16" y1="13" x2="8" y2="13"/>
              <line x1="16" y1="17" x2="8" y2="17"/>
            </svg>
          </div>
          <span className={`font-semibold text-slate-800 ${elderly ? "text-base" : "text-sm"}`}>
            {l("title")}
          </span>
        </div>

        {/* Language tabs */}
        <div className="flex gap-0.5 rounded-full bg-slate-100 p-0.5">
          {(["en", "hi", "mr"] as Lang[]).map(ll => (
            <button key={ll} onClick={() => setActiveLang(ll)}
              className={`rounded-full px-2.5 py-1 text-xs font-semibold transition-all ${
                activeLang === ll ? "bg-[#0D6B5E] text-white shadow-sm" : "text-slate-500 hover:text-slate-700"
              }`}>
              {ll === "en" ? "EN" : ll === "hi" ? "हिंदी" : "मराठी"}
            </button>
          ))}
        </div>
      </div>

      {/* Summary text */}
      <p className={`leading-relaxed text-slate-700 mb-4 ${elderly ? "text-base" : "text-sm"}`}>
        {summary}
      </p>

      {/* Actions */}
      <div className="flex gap-2">
        <button onClick={handleListen}
          className={`flex flex-1 items-center justify-center gap-2 rounded-xl border py-2.5 font-semibold transition-all ${
            isPlaying ? "border-[#0D6B5E] bg-[#0D6B5E] text-white" : "border-slate-200 text-slate-600 hover:border-[#0D6B5E] hover:text-[#0D6B5E]"
          } ${elderly ? "text-sm" : "text-xs"}`}>
          {isPlaying ? <VolumeX size={14}/> : <Volume2 size={14}/>}
          {isPlaying ? l("stop") : l("listen")}
        </button>

        <button onClick={handleCopy}
          className={`flex items-center justify-center gap-2 rounded-xl border px-4 py-2.5 font-semibold transition-all ${
            copied ? "border-emerald-300 bg-emerald-50 text-emerald-700" : "border-slate-200 text-slate-600 hover:bg-slate-50"
          } ${elderly ? "text-sm" : "text-xs"}`}>
          {copied ? <Check size={14}/> : <Copy size={14}/>}
          {copied ? l("copied") : l("copy")}
        </button>

        <button onClick={handleShare}
          className={`flex flex-1 items-center justify-center gap-2 rounded-xl bg-[#25D366] py-2.5 font-semibold text-white shadow-sm hover:bg-[#1fb958] transition-all ${elderly ? "text-sm" : "text-xs"}`}>
          <Share2 size={14}/>
          {l("share")}
        </button>
      </div>
    </div>
  );
}