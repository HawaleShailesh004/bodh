"use client";

import { useEffect, useState } from "react";

interface ScoreRingProps {
  score: number;
  size?: "sm" | "md" | "lg";
  showLabel?: boolean;
}

export default function ScoreRing({ score, size = "md", showLabel = true }: ScoreRingProps) {
  const [animated, setAnimated] = useState(0);

  useEffect(() => {
    const timer = setTimeout(() => setAnimated(score), 100);
    return () => clearTimeout(timer);
  }, [score]);

  const dims = { sm: 48, md: 64, lg: 80 };
  const radii = { sm: 17, md: 22, lg: 30 };
  const strokes = { sm: 4, md: 5, lg: 6 };
  const fontSizes = { sm: 10, md: 14, lg: 18 };

  const dim = dims[size];
  const r = radii[size];
  const stroke = strokes[size];
  const fontSize = fontSizes[size];
  const cx = dim / 2;
  const cy = dim / 2;

  const circumference = 2 * Math.PI * r;
  const progress = (animated / 100) * circumference;
  const color = score >= 80 ? "#10B981" : score >= 50 ? "#D97706" : "#E11D48";

  return (
    <div className="flex flex-col items-center gap-1">
      <svg
        width={dim} height={dim}
        viewBox={`0 0 ${dim} ${dim}`}
        style={{ transform: "rotate(-90deg)" }}
      >
        <circle
          cx={cx} cy={cy} r={r}
          fill="none"
          stroke="rgba(255,255,255,0.15)"
          strokeWidth={stroke}
        />
        <circle
          cx={cx} cy={cy} r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference - progress}
          style={{ transition: "stroke-dashoffset 1.2s cubic-bezier(0.16,1,0.3,1)" }}
        />
        <text
          x={cx} y={cy + fontSize * 0.4}
          textAnchor="middle"
          fontSize={fontSize}
          fontWeight="700"
          fill="white"
          style={{ transform: `rotate(90deg)`, transformOrigin: `${cx}px ${cy}px` }}
        >
          {score}
        </text>
      </svg>
      {showLabel && (
        <div className="text-center text-[9px] leading-tight text-white/60">
          Health<br/>Score
        </div>
      )}
    </div>
  );
}