"use client";

import { useState, useEffect } from "react";
import { Volume2, VolumeX, Share2, Copy, Check } from "lucide-react";
import type { AnalysisResult, Lang } from "@/lib/types";
import { SEV } from "@/lib/constants";

interface Props {
  result: AnalysisResult;
  lang: Lang;
  elderly?: boolean;
}

export default function SummaryCard({ result, lang, elderly = false }: Props) {
  const [isPlaying, setIsPlaying]   = useState(false);
  const [copied, setCopied]         = useState(false);
  const [activeLang, setActiveLang] = useState<Lang>(lang);

  useEffect(() => {
    setActiveLang(lang);
    if (isPlaying) { speechSynthesis.cancel(); setIsPlaying(false); }
  }, [lang]);

  const summary = (() => {
    if (activeLang === "hi" && result.report_summary_hi) return result.report_summary_hi;
    if (activeLang === "mr" && result.report_summary_mr) return result.report_summary_mr;
    return result.report_summary_en || "Summary not available.";
  })();

  const handleListen = () => {
    if (typeof window === "undefined") return;
    if (isPlaying) { speechSynthesis.cancel(); setIsPlaying(false); return; }
    const utter  = new SpeechSynthesisUtterance(summary);
    utter.lang   = activeLang === "hi" ? "hi-IN" : activeLang === "mr" ? "mr-IN" : "en-IN";
    utter.rate   = elderly ? 0.7 : 0.85;
    utter.onend  = () => setIsPlaying(false);
    utter.onerror = () => setIsPlaying(false);
    setIsPlaying(true);
    speechSynthesis.speak(utter);
  };

  const handleShare = () => {
    window.open(`https://wa.me/?text=${encodeURIComponent(`Bodh Health Summary\n\n${summary}\n\nAlways consult a doctor.`)}`, "_blank");
  };

  const handleCopy = async () => {
    await navigator.clipboard.writeText(summary);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const cfg = SEV[result.overall_severity];

  const L = {
    title:  { en: "Report Summary", hi: "रिपोर्ट का सारांश", mr: "अहवालाचा सारांश" },
    listen: { en: "Listen", hi: "आवाज़ में सुनें", mr: "आवाजात ऐका" },
    stop:   { en: "Stop", hi: "बंद करें", mr: "थांबवा" },
    copy:   { en: "Copy", hi: "नकल करें", mr: "नकल करा" },
    copied: { en: "Copied!", hi: "नकल की गई!", mr: "नकल केली!" },
    share:  { en: "Share", hi: "साझा करें", mr: "सामायिक करा" },
  };
  const l = (k: keyof typeof L) => L[k][activeLang];

  const useDevanagari = activeLang === "hi" || activeLang === "mr";

  return (
    <div
      className={`rounded-2xl bg-white px-6 py-5 ${useDevanagari ? "font-devanagari" : ""}`}
      style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.05), 0 4px 16px rgba(0,0,0,0.04)" }}
    >

      {/* Header — section label + language tabs */}
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          {/* Severity-colored dot */}
          <div className="h-2 w-2 rounded-full" style={{ background: cfg.color }} />
          <span className={`font-semibold text-slate-800 ${elderly ? "text-base" : "text-sm"}`}>
            {l("title")}
          </span>
        </div>

        {/* Language tabs */}
        <div className="flex gap-0.5 rounded-full bg-slate-100 p-0.5">
          {(["en", "hi", "mr"] as Lang[]).map(ll => (
            <button
              key={ll}
              onClick={() => setActiveLang(ll)}
              className={`rounded-full px-3 py-1 text-xs font-semibold transition-all ${
                activeLang === ll ? "bg-[#0D6B5E] text-white shadow-sm" : "text-slate-500 hover:text-slate-700"
              }`}
            >
              {ll === "en" ? "EN" : ll === "hi" ? "हिंदी" : "मराठी"}
            </button>
          ))}
        </div>
      </div>

      {/* Summary text — editorial paragraph style */}
      <p
        className={`leading-relaxed text-slate-700 mb-5 ${elderly ? "text-base" : "text-sm"}`}
        style={{ lineHeight: elderly ? 1.8 : 1.75 }}
      >
        {summary}
      </p>

      {/* Action bar */}
      <div className="flex gap-2">
        <button
          onClick={handleListen}
          className={`flex flex-1 items-center justify-center gap-2 rounded-xl border py-2.5 font-semibold transition-all ${
            isPlaying
              ? "border-[#0D6B5E] bg-[#0D6B5E] text-white"
              : "border-slate-200 text-slate-600 hover:border-[#0D6B5E] hover:text-[#0D6B5E]"
          } ${elderly ? "text-sm" : "text-xs"}`}
        >
          {isPlaying ? <VolumeX size={14}/> : <Volume2 size={14}/>}
          {isPlaying ? l("stop") : l("listen")}
        </button>

        <button
          onClick={handleCopy}
          className={`flex items-center justify-center gap-2 rounded-xl border px-4 py-2.5 font-semibold transition-all ${
            copied
              ? "border-emerald-300 bg-emerald-50 text-emerald-700"
              : "border-slate-200 text-slate-600 hover:bg-slate-50"
          } ${elderly ? "text-sm" : "text-xs"}`}
        >
          {copied ? <Check size={14}/> : <Copy size={14}/>}
          {copied ? l("copied") : l("copy")}
        </button>

        <button
          onClick={handleShare}
          className={`flex flex-1 items-center justify-center gap-2 rounded-xl bg-[#25D366] py-2.5 font-semibold text-white shadow-sm transition-all hover:bg-[#1fb958] ${elderly ? "text-sm" : "text-xs"}`}
        >
          <Share2 size={14}/>
          {l("share")}
        </button>
      </div>
    </div>
  );
}