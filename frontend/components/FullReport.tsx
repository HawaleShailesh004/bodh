"use client";

import { useMemo, useState } from "react";
import { ChevronDown } from "lucide-react";
import type { Biomarker, Lang, Severity } from "@/lib/types";
import { SEV, t } from "@/lib/constants";
import BioCard from "@/components/BioCard";
import JargonSheet from "@/components/JargonSheet";

const SECTIONS: { key: Severity; en: string; hi: string; mr: string }[] = [
  { key: "EMERGENCY", en: "Emergency", hi: "आपातकाल", mr: "आणीबाणी" },
  { key: "ACT_NOW", en: "Act Now", hi: "तुरंत करें", mr: "आत्ता करा" },
  { key: "WATCH", en: "Watch", hi: "ध्यान दें", mr: "लक्ष द्या" },
  { key: "NORMAL", en: "Normal", hi: "सामान्य", mr: "सामान्य" },
  { key: "UNKNOWN", en: "Unverified", hi: "असत्यापित", mr: "असत्यापित" },
];

interface FullReportProps {
  biomarkers: Biomarker[];
  lang: Lang;
  elderly?: boolean;
}

export default function FullReport({ biomarkers, lang, elderly = false }: FullReportProps) {
  const [open, setOpen] = useState(false);
  const [expanded, setExpanded] = useState<Set<number>>(new Set());
  const [jargon, setJargon] = useState<string | null>(null);

  const grouped = useMemo(
    () =>
      Object.fromEntries(
        SECTIONS.map((s) => [s.key, biomarkers.filter((b) => b.severity === s.key)]),
      ) as Record<Severity, Biomarker[]>,
    [biomarkers],
  );

  const toggle = (idx: number) => {
    setExpanded((prev) => {
      const n = new Set(prev);
      if (n.has(idx)) n.delete(idx);
      else n.add(idx);
      return n;
    });
  };

  const titles: Record<Lang, string> = {
    en: "Full biomarker report",
    hi: "पूर्ण बायोमार्कर रिपोर्ट",
    mr: "पूर्ण बायोमार्कर अहवाल",
  };

  return (
    <div className="rounded-2xl border border-slate-100 bg-white shadow-sm">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={`flex w-full items-center justify-between gap-3 px-4 py-3.5 text-left transition-colors hover:bg-slate-50/80 ${elderly ? "text-base" : "text-sm"}`}
      >
        <span className="font-semibold text-slate-800">{titles[lang]}</span>
        <span className="flex items-center gap-2 text-xs font-medium text-slate-500">
          {biomarkers.length} {lang === "hi" ? "मान" : lang === "mr" ? "मूल्ये" : "values"}
          <ChevronDown
            size={18}
            className="text-slate-400 transition-transform"
            style={{ transform: open ? "rotate(180deg)" : "rotate(0deg)" }}
          />
        </span>
      </button>

      {open && (
        <div className="space-y-6 border-t border-slate-100 px-4 pb-5 pt-4">
          {SECTIONS.map((sec) => {
            const items = grouped[sec.key];
            if (!items.length) return null;
            return (
              <div key={sec.key}>
                <div
                  className={`mb-3 flex items-center gap-2 font-bold uppercase tracking-widest text-slate-400 ${elderly ? "text-xs" : "text-[11px]"}`}
                >
                  <span className="h-2 w-2 rounded-full" style={{ background: SEV[sec.key].color }} />
                  {t(sec, lang)} <span className="font-normal">({items.length})</span>
                </div>
                <div className="flex flex-col gap-2">
                  {items.map((bio, i) => {
                    const idx = biomarkers.indexOf(bio);
                    return (
                      <BioCard
                        key={`${sec.key}-${idx}-${i}`}
                        bio={bio}
                        lang={lang}
                        expanded={expanded.has(idx)}
                        onToggle={() => toggle(idx)}
                        onJargon={setJargon}
                        elderly={elderly}
                      />
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {jargon && <JargonSheet word={jargon} lang={lang} onClose={() => setJargon(null)} />}
    </div>
  );
}
