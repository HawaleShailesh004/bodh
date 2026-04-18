"use client";

import type { AnalysisResult, Lang } from "@/lib/types";
import { SEV, PERSONAL_MESSAGES } from "@/lib/constants";
import ScoreRing from "@/components/ScoreRing";

const SEV_ICON: Record<string, string> = {
  NORMAL:    "M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z",
  WATCH:     "M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z",
  ACT_NOW:   "M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z",
  EMERGENCY: "M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z",
  UNKNOWN:   "M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z",
};

interface Props {
  result: AnalysisResult;
  lang: Lang;
  score: number;
  elderly?: boolean;
}

export default function PersonalMessage({ result, lang, score, elderly = false }: Props) {
  const cfg      = SEV[result.overall_severity];
  const messages = PERSONAL_MESSAGES[result.overall_severity] ?? PERSONAL_MESSAGES.UNKNOWN;
  const msg      = messages.msg[lang]  ?? messages.msg.en;
  const fact     = messages.fact[lang] ?? messages.fact.en;

  return (
    <div className={`relative overflow-hidden bg-gradient-to-br ${cfg.headerGrad} text-white`}>
      {/* Decorative rings */}
      <div className="pointer-events-none absolute -right-28 -top-28 h-80 w-80 rounded-full border border-white/[0.06]" />
      <div className="pointer-events-none absolute -bottom-20 -left-20 h-60 w-60 rounded-full border border-white/[0.05]" />
      <div className="pointer-events-none absolute right-[30%] top-1/2 h-36 w-36 -translate-y-1/2 rounded-full bg-white/[0.03]" />

      <div className="relative z-10 mx-auto max-w-5xl px-6 py-10 md:px-8 md:py-12">
        <div className="flex items-start justify-between gap-6">

          {/* ── Left ─────────────────────────── */}
          <div className="flex-1 min-w-0">

            {/* Severity chip */}
            <div className="mb-5 inline-flex items-center gap-2.5 rounded-full border border-white/20 bg-white/10 px-3.5 py-1.5 backdrop-blur-sm">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d={SEV_ICON[result.overall_severity] ?? SEV_ICON.UNKNOWN} />
              </svg>
              <span className="text-[11px] font-bold uppercase tracking-widest text-white/90">
                {cfg.label}
              </span>
              <span className="text-white/30">·</span>
              <span className="text-[11px] text-white/55">
                {result.total_biomarkers} values &nbsp;·&nbsp; {(result.processing_time_ms / 1000).toFixed(1)}s
              </span>
            </div>

            {/* Main message — Playfair Display */}
            <h1
              className="font-display font-bold leading-[1.15] text-white mb-4"
              style={{ fontSize: elderly ? "2.25rem" : "clamp(1.6rem, 3vw, 2.1rem)" }}
            >
              {msg}
            </h1>

            {/* Fact — left border accent */}
            <div className="mb-5 border-l-2 border-white/25 pl-4">
              <p className={`italic leading-relaxed text-white/60 ${elderly ? "text-sm" : "text-xs"}`}>
                {fact}
              </p>
            </div>

            {/* Specialist chip */}
            {result.specialist_recommendation && (
              <div className="mb-3 inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/10 px-3.5 py-2">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 12h-4l-3 9L9 3l-3 9H2"/>
                </svg>
                <span className={`text-white/90 ${elderly ? "text-sm" : "text-xs"}`}>
                  <strong>See:</strong> {result.specialist_recommendation} — {result.urgency_timeline}
                </span>
              </div>
            )}

            {/* Emergency note */}
            {result.emergency_message && (
              <div className="mt-3 rounded-xl border border-white/20 bg-white/10 px-4 py-3">
                <p className={`leading-relaxed text-white/90 ${elderly ? "text-base" : "text-sm"}`}>
                  {result.emergency_message}
                </p>
              </div>
            )}
          </div>

          {/* ── Right: score ring ────────────── */}
          <div className="flex-shrink-0">
            <ScoreRing score={score} size={elderly ? "lg" : "md"} showLabel />
          </div>

        </div>
      </div>
    </div>
  );
}