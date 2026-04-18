"use client";

import { useEffect, useState } from "react";
import type { Severity } from "@/lib/types";
import { SEV, SEV_RANGE_VIS } from "@/lib/constants";

export default function Gauge({
  value,
  low,
  high,
  severity,
}: {
  value: number;
  low: number;
  high: number;
  severity: Severity;
}) {
  const [angle, setAngle] = useState(-90);

  useEffect(() => {
    const ext = high - low === 0 ? 1 : high - low;
    const minBound = low - ext;
    const maxBound = high + ext;
    const pct = Math.max(
      0,
      Math.min(100, ((value - minBound) / (maxBound - minBound)) * 100),
    );
    const next = -90 + (pct / 100) * 180;
    const timer = setTimeout(() => setAngle(next), 150);
    return () => clearTimeout(timer);
  }, [value, low, high]);

  const cfg = SEV[severity];
  const vis = SEV_RANGE_VIS[severity];

  return (
    <div className="my-4 flex flex-col items-center gap-1">
      <svg width="120" height="72" viewBox="0 0 120 72">
        <path
          d="M 14 62 A 46 46 0 0 1 106 62"
          fill="none"
          stroke="#E2E8F0"
          strokeWidth="7"
          strokeLinecap="round"
        />
        <path
          d="M 14 62 A 46 46 0 0 1 37 22.2"
          fill="none"
          stroke="#FCA5A5"
          strokeWidth="7"
          strokeLinecap="round"
          opacity={0.6}
        />
        <path
          d="M 37 22.2 A 46 46 0 0 1 83 22.2"
          fill="none"
          stroke={vis.gaugeCenter}
          strokeWidth="7"
          strokeLinecap="round"
          opacity={0.85}
        />
        <path
          d="M 83 22.2 A 46 46 0 0 1 106 62"
          fill="none"
          stroke="#FCA5A5"
          strokeWidth="7"
          strokeLinecap="round"
          opacity={0.6}
        />
        <g
          style={{
            transformOrigin: "60px 62px",
            transform: `rotate(${angle}deg)`,
            transition: "transform 1s cubic-bezier(0.16, 1, 0.3, 1)",
          }}
        >
          <line
            x1="60"
            y1="62"
            x2="60"
            y2="24"
            stroke={cfg.color}
            strokeWidth="2.5"
            strokeLinecap="round"
          />
          <circle cx="60" cy="62" r="5" fill={cfg.color} />
          <circle cx="60" cy="62" r="2.5" fill="white" />
        </g>
        <text
          x="37"
          y="72"
          fontSize="9"
          fontWeight="600"
          fill="#94A3B8"
          textAnchor="middle"
        >
          {low}
        </text>
        <text
          x="83"
          y="72"
          fontSize="9"
          fontWeight="600"
          fill="#94A3B8"
          textAnchor="middle"
        >
          {high}
        </text>
      </svg>
      <div className="text-xs font-semibold tabular-nums" style={{ color: cfg.color }}>
        {value}{" "}
        <span className="text-[10px] font-normal text-slate-400">your value</span>
      </div>
    </div>
  );
}
