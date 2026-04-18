"use client";

import type { AnalysisResult, Lang } from "@/lib/types";
import { SEV, PERSONAL_MESSAGES } from "@/lib/constants";
import ScoreRing from "@/components/ScoreRing";

interface PersonalMessageProps {
  result: AnalysisResult;
  lang: Lang;
  score: number;
  elderly?: boolean;
}

const SEVERITY_ICON: Record<string, string> = {
  NORMAL:    "M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z",
  WATCH:     "M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z",
  ACT_NOW:   "M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z",
  EMERGENCY: "M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z",
  UNKNOWN:   "M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z",
};

export default function PersonalMessage({ result, lang, score, elderly = false }: PersonalMessageProps) {
  const cfg = SEV[result.overall_severity];
  const messages = PERSONAL_MESSAGES[result.overall_severity] ?? PERSONAL_MESSAGES.UNKNOWN;
  const msgLang = lang as keyof typeof messages.msg;
  const msg  = messages.msg[msgLang]  ?? messages.msg.en;
  const fact = messages.fact[msgLang] ?? messages.fact.en;

  return (
    <div className={`relative overflow-hidden bg-gradient-to-br ${cfg.headerGrad} px-6 py-8 text-white`}>
      {/* Decorative circles */}
      <div className="absolute -right-16 -top-16 h-56 w-56 rounded-full border border-white/5" />
      <div className="absolute -bottom-10 -left-10 h-40 w-40 rounded-full border border-white/5" />

      <div className="relative z-10 mx-auto max-w-5xl">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            {/* Severity chip */}
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1.5">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d={SEVERITY_ICON[result.overall_severity] ?? SEVERITY_ICON.UNKNOWN} />
              </svg>
              <span className="text-xs font-semibold uppercase tracking-wider text-white/90">
                {cfg.label}
              </span>
              <span className="text-white/40">·</span>
              <span className="text-xs text-white/70">
                {result.total_biomarkers} values analyzed · {(result.processing_time_ms / 1000).toFixed(1)}s
              </span>
            </div>

            {/* Main message */}
            <h1
              className={`font-bold leading-snug text-white mb-3 ${elderly ? "text-3xl" : "text-2xl"}`}
              style={{ fontFamily: "Georgia, serif" }}
            >
              {msg}
            </h1>

            {/* Motivational fact */}
            <p className={`leading-relaxed text-white/65 italic ${elderly ? "text-sm" : "text-xs"}`}>
              {fact}
            </p>

            {/* Specialist chip */}
            {result.specialist_recommendation && (
              <div className="mt-4 inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/10 px-3.5 py-2">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 12h-4l-3 9L9 3l-3 9H2"/>
                </svg>
                <span className={`text-white/90 ${elderly ? "text-sm" : "text-xs"}`}>
                  <strong>See:</strong> {result.specialist_recommendation} — {result.urgency_timeline}
                </span>
              </div>
            )}

            {result.emergency_message && (
              <div className="mt-3 rounded-xl border border-white/20 bg-white/10 px-4 py-3">
                <p className={`text-white/90 leading-relaxed ${elderly ? "text-base" : "text-sm"}`}>
                  {result.emergency_message}
                </p>
              </div>
            )}
          </div>

          {/* Score ring */}
          <div className="flex-shrink-0">
            <ScoreRing score={score} size={elderly ? "lg" : "md"} showLabel />
          </div>
        </div>
      </div>
    </div>
  );
}