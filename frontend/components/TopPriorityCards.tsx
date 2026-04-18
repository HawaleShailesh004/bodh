
"use client";

import { useState } from "react";
import { ChevronDown, TrendingUp, TrendingDown } from "lucide-react";
import type { Biomarker, Lang } from "@/lib/types";
import { SEV } from "@/lib/constants";
import { cleanName, explanationFor, fmtVal, sevLabel } from "@/lib/helpers";
import Gauge from "@/components/Gauge";

interface TopPriorityCardsProps {
  biomarkers: Biomarker[];
  lang: Lang;
  elderly?: boolean;
}

export default function TopPriorityCards({ biomarkers, lang, elderly = false }: TopPriorityCardsProps) {
  const [expanded, setExpanded] = useState<number | null>(null);

  const top3 = [...biomarkers]
    .filter(b => b.severity !== "NORMAL" && b.severity !== "UNKNOWN")
    .sort((a, b) => b.deviation_score - a.deviation_score)
    .slice(0, 3);

  if (!top3.length) return null;

  const labels: Record<Lang, string> = {
    en: "Needs Most Attention",
    hi: "सबसे अधिक ध्यान चाहिए",
    mr: "सर्वाधिक लक्ष आवश्यक",
  };

  return (
    <div>
      <h2 className={`mb-3 font-bold uppercase tracking-widest text-slate-400 ${elderly ? "text-sm" : "text-[11px]"}`}>
        {labels[lang]} ({top3.length})
      </h2>

      <div className="grid gap-3" style={{ gridTemplateColumns: `repeat(${top3.length}, 1fr)` }}>
        {top3.map((bio, i) => {
          const cfg = SEV[bio.severity];
          const name = cleanName(bio.raw_name);
          const isExpanded = expanded === i;
          const isHigh = bio.active_ref_high != null && bio.value > bio.active_ref_high;
          const isLow  = bio.active_ref_low  != null && bio.value < bio.active_ref_low;

          return (
            <div
              key={i}
              onClick={() => setExpanded(isExpanded ? null : i)}
              className="cursor-pointer rounded-2xl border p-4 shadow-sm transition-all duration-200 hover:shadow-md"
              style={{
                borderColor: isExpanded ? cfg.border : "#E2E8F0",
                background: isExpanded ? cfg.bg : "white",
                boxShadow: isExpanded ? `0 4px 20px ${cfg.color}18` : undefined,
              }}
            >
              {/* Priority badge */}
              <div className="mb-3 flex items-center justify-between">
                <span
                  className="rounded-full px-2 py-0.5 font-bold text-white"
                  style={{ fontSize: 9, background: cfg.color }}
                >
                  #{i + 1} PRIORITY
                </span>
                <div className="flex items-center gap-1">
                  {isHigh && <TrendingUp size={12} style={{ color: cfg.color }} />}
                  {isLow  && <TrendingDown size={12} style={{ color: cfg.color }} />}
                  <ChevronDown
                    size={13}
                    className="text-slate-400 transition-transform duration-200"
                    style={{ transform: isExpanded ? "rotate(180deg)" : "none" }}
                  />
                </div>
              </div>

              {/* Name */}
              <div className={`font-semibold text-slate-800 mb-1 leading-tight ${elderly ? "text-base" : "text-sm"}`}>
                {name}
              </div>

              {/* Value — big */}
              <div
                className="font-bold tabular-nums mb-1"
                style={{
                  fontFamily: "'JetBrains Mono', monospace",
                  color: cfg.color,
                  fontSize: elderly ? 24 : 20,
                }}
              >
                {fmtVal(bio.value, bio.unit)}
              </div>

              {/* Range */}
              {bio.active_ref_low != null && (
                <div className="text-[10px] text-slate-400 mb-2">
                  Normal: {bio.active_ref_low} – {bio.active_ref_high}
                </div>
              )}

              {/* Severity badge */}
              <span className={`rounded-full px-2 py-0.5 font-semibold ${cfg.badge} ${elderly ? "text-xs" : "text-[10px]"}`}>
                {sevLabel(bio.severity, lang)}
              </span>

              {/* Expanded: gauge + explanation */}
              {isExpanded && (
                <div className="mt-3 pt-3" style={{ borderTop: `1px solid ${cfg.border}` }}>
                  {bio.active_ref_low != null && bio.active_ref_high != null && (
                    <Gauge
                      value={bio.value}
                      low={bio.active_ref_low}
                      high={bio.active_ref_high}
                      severity={bio.severity}
                    />
                  )}
                  <p className={`leading-relaxed text-slate-700 ${elderly ? "text-sm" : "text-xs"}`}>
                    {explanationFor(bio, lang)}
                  </p>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}