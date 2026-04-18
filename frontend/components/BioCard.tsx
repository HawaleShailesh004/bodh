"use client";

import { useMemo } from "react";
import { ChevronDown, AlertTriangle } from "lucide-react";
import type { Biomarker, Lang } from "@/lib/types";
import { cleanName, explanationFor, fmtVal, sevLabel } from "@/lib/helpers";
import { JARGON, SEV } from "@/lib/constants";
import RangeBar from "@/components/RangeBar";
import Gauge from "@/components/Gauge";

interface BioCardProps {
  bio: Biomarker;
  lang: Lang;
  expanded: boolean;
  onToggle: () => void;
  onJargon: (word: string) => void;
  elderly?: boolean;
}

export default function BioCard({ bio, lang, expanded, onToggle, onJargon, elderly = false }: BioCardProps) {
  const cfg        = SEV[bio.severity];
  const explanation = explanationFor(bio, lang);
  const name       = cleanName(bio.raw_name);
  const dietTip    = lang === "hi" ? bio.diet_tip_hi : bio.diet_tip_en;

  const renderedText = useMemo(() => {
    return explanation.split(" ").map((word, i, arr) => {
      const clean = word.toLowerCase().replace(/[.,!?]/g, "");
      if (JARGON[clean]) {
        return (
          <button
            key={`${clean}-${i}`}
            className="border-b border-dashed border-[#0D6B5E] text-[#0D6B5E] hover:bg-emerald-50 rounded-sm px-0.5 transition-colors"
            onClick={e => { e.stopPropagation(); onJargon(clean); }}
          >
            {word}{i < arr.length - 1 ? " " : ""}
          </button>
        );
      }
      return <span key={`${word}-${i}`}>{word}{i < arr.length - 1 ? " " : ""}</span>;
    });
  }, [explanation, onJargon]);

  return (
    <div
      className="cursor-pointer overflow-hidden rounded-xl transition-all duration-200"
      style={{
        background: expanded ? cfg.bg : "white",
        border: expanded ? `1.5px solid ${cfg.border}` : "1.5px solid transparent",
        boxShadow: expanded
          ? `0 4px 20px ${cfg.color}14`
          : "0 1px 3px rgba(0,0,0,0.05), 0 2px 8px rgba(0,0,0,0.04)",
      }}
      onClick={onToggle}
    >
      <div className="flex" style={{ minHeight: elderly ? 68 : 56 }}>

        {/* Left accent rail — thicker */}
        <div
          className="w-[3px] flex-shrink-0"
          style={{ background: bio.severity === "NORMAL" ? "#D1FAE5" : cfg.color }}
        />

        <div className="flex-1 px-4 py-3">
          {/* Header row */}
          <div className="flex items-center gap-3">
            <div className="flex-1 min-w-0">
              <div className={`font-semibold text-slate-900 truncate ${elderly ? "text-base" : "text-sm"}`}>
                {name}
              </div>
              {bio.needs_manual_review && (
                <div className="mt-0.5 flex items-center gap-1 text-amber-600" style={{ fontSize: 10 }}>
                  <AlertTriangle size={9} />
                  <span>Verify this value</span>
                </div>
              )}
            </div>

            {/* Value — always colored for abnormal */}
            <div className="text-right flex-shrink-0">
              <div
                className="font-mono font-bold tabular-nums"
                style={{
                  fontSize: elderly ? 19 : 17,
                  color: bio.severity === "NORMAL" ? "#0F172A" : cfg.color,
                }}
              >
                {fmtVal(bio.value, bio.unit)}
              </div>
              {bio.active_ref_low != null && (
                <div className="text-[9px] text-slate-400 mt-0.5">
                  {bio.active_ref_low}–{bio.active_ref_high}
                </div>
              )}
            </div>

            {/* Severity badge */}
            <span className={`flex-shrink-0 rounded-full px-2 py-0.5 font-semibold ${cfg.badge} ${elderly ? "text-xs" : "text-[10px]"}`}>
              {sevLabel(bio.severity, lang)}
            </span>

            {/* Chevron */}
            <ChevronDown
              size={14}
              className="flex-shrink-0 text-slate-400 transition-transform duration-200"
              style={{ transform: expanded ? "rotate(180deg)" : "none" }}
            />
          </div>

          {/* Range bar */}
          <RangeBar bio={bio} />

          {/* Expanded content */}
          {expanded && (
            <div
              className="mt-3 pt-3"
              style={{ borderTop: `1px solid ${cfg.border}` }}
            >
              {/* Gauge for abnormal */}
              {bio.active_ref_low != null && bio.active_ref_high != null &&
               bio.severity !== "NORMAL" && bio.severity !== "UNKNOWN" && (
                <Gauge
                  value={bio.value}
                  low={bio.active_ref_low}
                  high={bio.active_ref_high}
                  severity={bio.severity}
                />
              )}

              {/* Explanation with jargon highlighting */}
              <p className={`leading-relaxed text-slate-700 mb-3 ${elderly ? "text-base" : "text-sm"}`}>
                {renderedText}
              </p>

              {/* Diet tip */}
              {dietTip && (
                <div
                  className="rounded-r-lg px-3 py-2.5 leading-relaxed"
                  style={{
                    background: "#FFFBEB",
                    borderLeft: "3px solid #D97706",
                    fontSize: elderly ? 14 : 12,
                    color: "#78350F",
                  }}
                >
                  <span className="font-semibold">
                    {lang === "hi" ? "आहार सुझाव: " : lang === "mr" ? "आहार सूचना: " : "Diet tip: "}
                  </span>
                  {dietTip}
                </div>
              )}

              {/* ICMR source note */}
              {bio.range_source === "icmr" && (
                <p className="mt-2 text-[9px] text-slate-400">
                  Range: ICMR Indian population guidelines
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}