"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { JARGON } from "@/lib/constants";
import type { Lang } from "@/lib/types";

export default function JargonSheet({ word, lang, onClose }: {
  word: string; lang: Lang; onClose: () => void;
}) {
  const [visible, setVisible] = useState(false);
  const entry = JARGON[word.toLowerCase()];

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 10);
    return () => clearTimeout(t);
  }, []);

  const handleClose = () => {
    setVisible(false);
    setTimeout(onClose, 250);
  };

  if (!entry) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end"
      style={{
        background: visible ? "rgba(0,0,0,0.45)" : "rgba(0,0,0,0)",
        transition: "background 0.25s ease",
      }}
      onClick={handleClose}
    >
      <div
        className="relative w-full rounded-t-3xl bg-white px-6 pb-10 pt-5 shadow-2xl"
        style={{
          transform: visible ? "translateY(0)" : "translateY(100%)",
          transition: "transform 0.3s cubic-bezier(0.16,1,0.3,1)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Handle */}
        <div className="mx-auto mb-5 h-1 w-10 rounded-full bg-slate-200" />

        {/* Close */}
        <button
          onClick={handleClose}
          className="absolute right-5 top-5 rounded-full p-1 text-slate-400 hover:bg-slate-100"
        >
          <X size={18} />
        </button>

        {/* Content */}
        <div className="mb-1 text-[10px] font-semibold uppercase tracking-widest text-slate-400">
          Medical Term
        </div>
        <div className="mb-4 text-2xl font-bold capitalize text-slate-900">{word}</div>
        <p className="text-base leading-relaxed text-slate-600">
          {lang === "hi" ? entry.hi : entry.en}
        </p>
        <p className="mt-3 text-xs text-slate-400">Source: ICMR Medical Terminology</p>
      </div>
    </div>
  );
}