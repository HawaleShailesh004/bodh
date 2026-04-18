"use client";

import { useMemo, useState } from "react";
import { ChevronDown, Search, X, LayoutList } from "lucide-react";
import type { Biomarker, Lang, Severity } from "@/lib/types";
import { SEV, t } from "@/lib/constants";
import { cleanName } from "@/lib/helpers";
import BioCard from "@/components/BioCard";
import JargonSheet from "@/components/JargonSheet";

const SECTIONS: { key: Severity; en: string; hi: string; mr: string }[] = [
  { key: "EMERGENCY", en: "Emergency",  hi: "आपातकाल",   mr: "आणीबाणी" },
  { key: "ACT_NOW",   en: "Act Now",    hi: "तुरंत करें", mr: "आत्ता करा" },
  { key: "WATCH",     en: "Watch",      hi: "ध्यान दें",  mr: "लक्ष द्या" },
  { key: "NORMAL",    en: "Normal",     hi: "सामान्य",    mr: "सामान्य" },
  { key: "UNKNOWN",   en: "Unverified", hi: "असत्यापित",  mr: "असत्यापित" },
];

const TITLES: Record<Lang, string> = {
  en: "View Full Report",
  hi: "पूरी रिपोर्ट देखें",
  mr: "संपूर्ण अहवाल पाहा",
};

interface Props {
  biomarkers: Biomarker[];
  lang: Lang;
  elderly?: boolean;
}

export default function FullReport({ biomarkers, lang, elderly = false }: Props) {
  const [open, setOpen]       = useState(false);
  const [query, setQuery]     = useState("");
  const [expanded, setExpanded] = useState<Set<number>>(new Set());
  const [jargon, setJargon]   = useState<string | null>(null);

  const grouped = useMemo(
    () => Object.fromEntries(SECTIONS.map(s => [s.key, biomarkers.filter(b => b.severity === s.key)])) as Record<Severity, Biomarker[]>,
    [biomarkers],
  );

  const filtered = useMemo(() => {
    if (!query.trim()) return null;
    const q = query.toLowerCase();
    return biomarkers.filter(b => cleanName(b.raw_name).toLowerCase().includes(q) || b.raw_name.toLowerCase().includes(q));
  }, [biomarkers, query]);

  const toggle = (idx: number) => {
    setExpanded(prev => {
      const n = new Set(prev);
      n.has(idx) ? n.delete(idx) : n.add(idx);
      return n;
    });
  };

  const abnormalCount = biomarkers.filter(b => b.severity !== "NORMAL" && b.severity !== "UNKNOWN").length;

  return (
    <div
      className="rounded-2xl overflow-hidden bg-white"
      style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.05), 0 4px 16px rgba(0,0,0,0.04)" }}
    >
      {/* Toggle header */}
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left transition-colors hover:bg-slate-50/80"
      >
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100">
            <LayoutList size={14} className="text-slate-500" />
          </div>
          <div>
            <div className={`font-semibold text-slate-800 ${elderly ? "text-base" : "text-sm"}`}>
              {TITLES[lang]}
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">
              {biomarkers.length} values · {abnormalCount > 0 ? `${abnormalCount} need attention` : "all normal"}
            </div>
          </div>
        </div>
        <ChevronDown
          size={16}
          className="text-slate-400 transition-transform duration-200 flex-shrink-0"
          style={{ transform: open ? "rotate(180deg)" : "none" }}
        />
      </button>

      {/* Content */}
      {open && (
        <div className="border-t border-slate-100">
          {/* Search bar */}
          <div className="px-4 py-3 border-b border-slate-50">
            <div className="relative">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder={lang === "hi" ? "मान खोजें..." : lang === "mr" ? "मूल्ये शोधा..." : "Search values..."}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2 pl-8 pr-8 text-slate-800 outline-none focus:border-[#0D6B5E] focus:ring-1 focus:ring-[#0D6B5E]/20"
                style={{ fontSize: elderly ? 14 : 12 }}
              />
              {query && (
                <button onClick={() => setQuery("")} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                  <X size={12} />
                </button>
              )}
            </div>
          </div>

          {/* Biomarker list */}
          <div className="px-4 pb-4 pt-3 space-y-5">
            {filtered !== null ? (
              filtered.length === 0 ? (
                <p className="py-8 text-center text-sm text-slate-400">
                  {lang === "hi" ? "कोई परिणाम नहीं" : lang === "mr" ? "परिणाम नाही" : "No results found"}
                </p>
              ) : (
                <div className="space-y-2">
                  {filtered.map(bio => {
                    const idx = biomarkers.indexOf(bio);
                    return (
                      <BioCard key={idx} bio={bio} lang={lang} elderly={elderly}
                        expanded={expanded.has(idx)}
                        onToggle={() => toggle(idx)}
                        onJargon={setJargon}
                      />
                    );
                  })}
                </div>
              )
            ) : (
              SECTIONS.map(sec => {
                const items = grouped[sec.key];
                if (!items.length) return null;
                return (
                  <div key={sec.key}>
                    <div className={`mb-2.5 flex items-center gap-2 font-bold uppercase tracking-widest text-slate-400 ${elderly ? "text-xs" : "text-[10px]"}`}>
                      <div className="h-2 w-2 rounded-full" style={{ background: SEV[sec.key].color }} />
                      {t(sec, lang)} <span className="font-normal">({items.length})</span>
                    </div>
                    <div className="space-y-2">
                      {items.map(bio => {
                        const idx = biomarkers.indexOf(bio);
                        return (
                          <BioCard key={idx} bio={bio} lang={lang} elderly={elderly}
                            expanded={expanded.has(idx)}
                            onToggle={() => toggle(idx)}
                            onJargon={setJargon}
                          />
                        );
                      })}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {jargon && (
        <JargonSheet word={jargon} lang={lang} onClose={() => setJargon(null)} />
      )}
    </div>
  );
}