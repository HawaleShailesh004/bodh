"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Printer, Share2 } from "lucide-react";
import PersonalMessage from "@/components/PersonalMessage";
import SummaryCard from "@/components/SummaryCard";
import TopPriorityCards from "@/components/TopPriorityCards";
import FullReport from "@/components/FullReport";
import DoctorQuestions from "@/components/DoctorQuestions";
import ReportChat from "@/components/ReportChat";
import JargonSheet from "@/components/JargonSheet";
import { useApp } from "@/context/AppContext";
import type { AnalysisResult } from "@/lib/types";
import { calcScore, cleanName, fmtVal, normalizeAnalysisResult } from "@/lib/helpers";
import { BODH_PRINT_SNAPSHOT_KEY, SEV } from "@/lib/constants";

export default function ResultsPage() {
  const { result, setResult, lang, elderly } = useApp();
  const router = useRouter();

  const [jargon, setJargon]     = useState<string | null>(null);
  const [progress, setProgress] = useState(0);

  // Restore from sessionStorage on refresh
  useEffect(() => {
    if (!result) {
      const saved = sessionStorage.getItem("bodh_result");
      if (saved) setResult(normalizeAnalysisResult(JSON.parse(saved) as AnalysisResult));
      else router.replace("/analyze");
    }
  }, [result, router, setResult]);

  // Reading progress bar
  useEffect(() => {
    const onScroll = () => {
      const scrolled = window.scrollY;
      const max = document.body.scrollHeight - window.innerHeight;
      setProgress(max > 0 ? (scrolled / max) * 100 : 0);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const score = useMemo(() => (result ? calcScore(result.biomarkers) : 0), [result]);

  const stagePrintSnapshot = useCallback(() => {
    if (!result) return;
    try {
      localStorage.setItem(BODH_PRINT_SNAPSHOT_KEY, JSON.stringify(result));
    } catch {
      /* ignore quota / private mode */
    }
  }, [result]);

  const shareWA = useCallback(() => {
    if (!result) return;
    const cfg = SEV[result.overall_severity];
    const ab  = result.biomarkers
      .filter(b => b.severity !== "NORMAL" && b.severity !== "UNKNOWN")
      .map(b => `• ${cleanName(b.raw_name)}: ${fmtVal(b.value, b.unit)}`)
      .join("\n");
    const msg = [
      `*Bodh Health Report*`,
      `Overall: ${cfg.label}`,
      ab ? `\nNeeds attention:\n${ab}` : "",
      result.specialist_recommendation
        ? `\nSpecialist: ${result.specialist_recommendation} — ${result.urgency_timeline}`
        : "",
      `\n_Always consult a doctor._`,
    ].filter(Boolean).join("\n");
    window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, "_blank");
  }, [result]);

  if (!result) return null;

  const cfg = SEV[result.overall_severity];

  return (
    <div className={`min-h-screen ${cfg.pageTint}`}>
      {/* Reading progress bar */}
      <div
        className="fixed left-0 top-0 z-50 h-0.5 bg-[#0D6B5E] transition-none"
        style={{ width: `${progress}%` }}
      />

      {/* Zone 1: Personal Message + Score */}
      <PersonalMessage result={result} lang={lang} score={score} elderly={elderly} />

      {/* Main content */}
      <main className="mx-auto w-full max-w-5xl px-5 py-6 md:px-8 md:py-8">
        <div className="space-y-5">

          {/* Zone 2: AI Summary + Voice */}
          <SummaryCard result={result} lang={lang} elderly={elderly} />

          {/* Zone 3: Top 3 Priority Cards */}
          <TopPriorityCards biomarkers={result.biomarkers} lang={lang} elderly={elderly} />

          {/* Zone 4: Collapsible Full Report */}
          <FullReport biomarkers={result.biomarkers} lang={lang} elderly={elderly} />

          {/* Zone 5: Doctor questions + share */}
          {result.overall_severity !== "NORMAL" && (
            <DoctorQuestions result={result} lang={lang} elderly={elderly} />
          )}

          {/* AI divergence notice */}
          {result.ai_diverged && (
            <div className={`rounded-xl border border-amber-100 bg-amber-50 px-4 py-3 text-amber-700 ${elderly ? "text-sm" : "text-xs"}`}>
              Two AI models reviewed this report. We showed the more conservative interpretation where they differed.
            </div>
          )}

          {/* Desktop / tablet: Share + Print (sticky bar below is md:hidden only) */}
          <div className="hidden flex-col gap-3 border-t border-slate-200/80 pt-5 md:flex md:flex-row md:flex-wrap md:items-center md:justify-end">
            <button
              type="button"
              onClick={shareWA}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#25D366] px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-opacity hover:opacity-95"
            >
              <Share2 size={15} />
              {lang === "hi" ? "शेयर" : lang === "mr" ? "शेअर" : "Share on WhatsApp"}
            </button>
            <Link
              href="/print"
              target="_blank"
              rel="noopener noreferrer"
              onClick={stagePrintSnapshot}
              className={`inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 py-2.5 font-semibold text-slate-600 shadow-sm transition-all hover:border-slate-300 hover:bg-slate-50 ${elderly ? "text-base" : "text-sm"}`}
            >
              <Printer size={16} />
              {lang === "hi" ? "डॉक्टर के लिए प्रिंट करें" : lang === "mr" ? "डॉक्टरसाठी प्रिंट करा" : "Print for doctor"}
            </Link>
          </div>

          {/* Bottom padding for mobile sticky bar */}
          <div className="h-16 md:h-0" />
        </div>
      </main>

      {/* Mobile sticky bottom bar */}
      <div className="fixed bottom-0 left-0 right-0 z-40 flex items-center gap-2 border-t border-slate-100 bg-white/95 px-4 py-3 backdrop-blur-sm md:hidden">
        {/* Mini score */}
        <div className="flex items-center gap-2 rounded-xl bg-slate-50 px-3 py-1.5">
          <div
            className="h-2.5 w-2.5 rounded-full"
            style={{ background: score >= 80 ? "#10B981" : score >= 50 ? "#D97706" : "#E11D48" }}
          />
          <span className="text-xs font-bold text-slate-700">{score}</span>
          <span className="text-[10px] text-slate-400">score</span>
        </div>

        {/* Overall severity */}
        <div
          className="rounded-xl px-3 py-1.5 text-xs font-semibold"
          style={{ background: cfg.bg, color: cfg.text }}
        >
          {cfg.label}
        </div>

        <div className="ml-auto flex items-center gap-2">
          {/* Share */}
          <button
            type="button"
            onClick={shareWA}
            className="flex items-center gap-2 rounded-xl bg-[#25D366] px-4 py-2 text-xs font-semibold text-white shadow-sm"
          >
            <Share2 size={13} />
            {lang === "hi" ? "शेयर" : lang === "mr" ? "शेअर" : "Share"}
          </button>

          <Link
            href="/print"
            target="_blank"
            rel="noopener noreferrer"
            onClick={stagePrintSnapshot}
            className={`flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white py-3 font-semibold text-slate-600 shadow-sm transition-all hover:border-slate-300 hover:bg-slate-50 ${elderly ? "text-base" : "text-sm"}`}
          >
            <Printer size={15} />
            {lang === "hi" ? "डॉक्टर के लिए प्रिंट करें" : lang === "mr" ? "डॉक्टरसाठी प्रिंट करा" : "Print for Doctor"}
          </Link>
        </div>
      </div>

      {/* Jargon sheet */}
      {jargon && <JargonSheet word={jargon} lang={lang} onClose={() => setJargon(null)} />}

      <ReportChat result={result} lang={lang} elderly={elderly} />
    </div>
  );
}