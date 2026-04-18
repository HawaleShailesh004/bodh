"use client";

import { motion } from "framer-motion";
import type { Biomarker } from "@/lib/types";
import { SEV, SEV_RANGE_VIS } from "@/lib/constants";

export default function RangeBar({ bio }: { bio: Biomarker }) {
  const lo = bio.active_ref_low;
  const hi = bio.active_ref_high;

  if (lo == null || hi == null) return null;

  // Extension = 1× the range on both sides so [lo, hi] maps to 33.33%–66.66%.
  const ext = hi - lo === 0 ? 1 : hi - lo;
  const minBound = lo - ext;
  const maxBound = hi + ext;

  const pct = Math.max(
    2,
    Math.min(98, ((bio.value - minBound) / (maxBound - minBound)) * 100),
  );

  const cfg = SEV[bio.severity];
  const vis = SEV_RANGE_VIS[bio.severity];

  return (
    <div className="mt-2.5 mb-1">
      <div className="relative h-1.5 rounded-full bg-slate-200">
        <div
          className={`absolute top-0 bottom-0 rounded-full ${vis.bar}`}
          style={{ left: "33.33%", width: "33.33%" }}
        />
        <motion.div
          className="absolute top-1/2 h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow-sm"
          style={{ background: cfg.color }}
          initial={{ left: "50%" }}
          animate={{ left: `${pct}%` }}
          transition={{ type: "spring", stiffness: 80, damping: 18, delay: 0.15 }}
        />
      </div>
      <div className="mt-1 flex justify-between text-[9px] text-slate-400">
        <span>Low</span>
        <span className={`font-semibold ${vis.label}`}>
          {lo} – {hi}
        </span>
        <span>High</span>
      </div>
    </div>
  );
}
