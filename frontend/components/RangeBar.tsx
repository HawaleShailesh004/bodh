import type { Biomarker } from "@/lib/types";
import { SEV } from "@/lib/constants";

export default function RangeBar({ bio }: { bio: Biomarker }) {
  if (bio.active_ref_low == null || bio.active_ref_high == null) return null;

  const lo = bio.active_ref_low;
  const hi = bio.active_ref_high;
  const ext = (hi - lo) * 0.5;
  const pct = Math.max(2, Math.min(98,
    ((bio.value - (lo - ext)) / ((hi + ext) - (lo - ext))) * 100
  ));

  const cfg = SEV[bio.severity];

  return (
    <div className="mt-2.5 mb-1">
      <div className="relative h-1.5 rounded-full bg-slate-100">
        {/* Normal zone */}
        <div className="absolute top-0 bottom-0 rounded-full bg-emerald-200"
          style={{ left: "33%", width: "34%" }} />
        {/* Marker */}
        <div
          className="absolute top-1/2 h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow-sm"
          style={{
            left: `${pct}%`,
            background: cfg.color,
            transition: "left 0.6s cubic-bezier(0.16,1,0.3,1)",
          }}
        />
      </div>
      <div className="mt-1 flex justify-between text-[9px] text-slate-400">
        <span>Low</span>
        <span className="font-semibold text-emerald-600">{lo} – {hi}</span>
        <span>High</span>
      </div>
    </div>
  );
}