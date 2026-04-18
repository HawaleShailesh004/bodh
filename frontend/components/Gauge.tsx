"use client";

import { useEffect, useState } from "react";
import type { Severity } from "@/lib/types";
import { SEV } from "@/lib/constants";

export default function Gauge({ value, low, high, severity }: {
  value: number; low: number; high: number; severity: Severity;
}) {
  const [angle, setAngle] = useState(-135);

  useEffect(() => {
    const ext = (high - low) * 0.4;
    const pct = Math.max(0, Math.min(100, ((value - (low - ext)) / ((high + ext) - (low - ext))) * 100));
    const timer = setTimeout(() => setAngle(-135 + (pct / 100) * 270), 150);
    return () => clearTimeout(timer);
  }, [value, low, high]);

  const cfg = SEV[severity];

  return (
    <div className="my-3 flex flex-col items-center gap-1">
      <svg width="130" height="76" viewBox="0 0 130 76">
        {/* Track */}
        <path d="M 18 66 A 48 48 0 0 1 112 66" fill="none" stroke="#E2E8F0" strokeWidth="7" strokeLinecap="round"/>
        {/* Low zone */}
        <path d="M 18 66 A 48 48 0 0 1 43 26" fill="none" stroke="#FCA5A5" strokeWidth="7" strokeLinecap="round" opacity="0.6"/>
        {/* Normal zone */}
        <path d="M 43 26 A 48 48 0 0 1 87 26" fill="none" stroke="#6EE7B7" strokeWidth="7" strokeLinecap="round" opacity="0.7"/>
        {/* High zone */}
        <path d="M 87 26 A 48 48 0 0 1 112 66" fill="none" stroke="#FCA5A5" strokeWidth="7" strokeLinecap="round" opacity="0.6"/>
        {/* Needle group */}
        <g style={{
          transformOrigin: "65px 66px",
          transform: `rotate(${angle}deg)`,
          transition: "transform 1s cubic-bezier(0.16,1,0.3,1)",
        }}>
          <line x1="65" y1="66" x2="65" y2="26"
            stroke={cfg.color} strokeWidth="2.5" strokeLinecap="round"/>
          <circle cx="65" cy="66" r="5" fill={cfg.color}/>
          <circle cx="65" cy="66" r="2.5" fill="white"/>
        </g>
        <text x="20" y="76" fontSize="8" fill="#94A3B8" textAnchor="middle">{low}</text>
        <text x="110" y="76" fontSize="8" fill="#94A3B8" textAnchor="middle">{high}</text>
      </svg>
      <div className="text-xs font-semibold tabular-nums" style={{ color: cfg.color }}>
        {value} <span className="font-normal text-slate-400 text-[10px]">your value</span>
      </div>
    </div>
  );
}