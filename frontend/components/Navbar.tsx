"use client";

import Link from "next/link";
import { useApp } from "@/context/AppContext";
import type { Lang } from "@/lib/types";

interface NavbarProps {
  lang: Lang;
  setLang: (l: Lang) => void;
  backHref?: string;
  backLabel?: string;
}

export default function Navbar({ lang, setLang, backHref, backLabel }: NavbarProps) {
  const { elderly, setElderly } = useApp();

  return (
    <nav className="sticky top-0 z-40 border-b border-slate-100 bg-white/95 backdrop-blur-sm">
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
        {/* Logo */}
        {backHref ? (
          <Link href={backHref} className="flex items-center gap-2.5 group">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-[#0D6B5E] to-[#1A9E86] shadow-sm">
              <svg width="18" height="13" viewBox="0 0 24 16" fill="none">
                <polyline points="0,8 4,8 6,2 9,14 12,0 15,10 17,8 24,8"
                  stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <div>
              <div className="font-bold text-[#0D6B5E] leading-none" style={{ fontFamily: "Georgia, serif", fontSize: 16 }}>Bodh</div>
              <div className="text-[9px] text-slate-400 leading-none mt-0.5">बोध · awareness</div>
            </div>
          </Link>
        ) : (
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-[#0D6B5E] to-[#1A9E86] shadow-sm">
              <svg width="18" height="13" viewBox="0 0 24 16" fill="none">
                <polyline points="0,8 4,8 6,2 9,14 12,0 15,10 17,8 24,8"
                  stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <div>
              <div className="font-bold text-[#0D6B5E] leading-none" style={{ fontFamily: "Georgia, serif", fontSize: 16 }}>Bodh</div>
              <div className="text-[9px] text-slate-400 leading-none mt-0.5">बोध · awareness</div>
            </div>
          </Link>
        )}

        {/* Right controls */}
        <div className="flex items-center gap-2">
          {/* Elderly mode toggle */}
          <button
            onClick={() => setElderly(!elderly)}
            title={elderly ? "Disable large text" : "Enable large text mode"}
            className={`rounded-lg border px-2.5 py-1.5 text-xs font-bold transition-all ${
              elderly
                ? "border-[#0D6B5E] bg-[#0D6B5E] text-white"
                : "border-slate-200 text-slate-500 hover:border-slate-300"
            }`}
          >
            A+
          </button>

          {/* Back label */}
          {backHref && backLabel && (
            <Link
              href={backHref}
              className="hidden rounded-lg border border-slate-200 px-3 py-1.5 text-xs text-slate-500 hover:bg-slate-50 sm:block"
            >
              {backLabel}
            </Link>
          )}

          {/* Lang toggle */}
          <div className="flex gap-0.5 rounded-full bg-slate-100 p-1">
            {(["en", "hi", "mr"] as Lang[]).map((l) => (
              <button
                key={l}
                onClick={() => setLang(l)}
                className={`rounded-full px-2.5 py-0.5 text-xs font-semibold transition-all ${
                  lang === l ? "bg-[#0D6B5E] text-white shadow-sm" : "text-slate-500 hover:text-slate-700"
                }`}
              >
                {l === "en" ? "EN" : l === "hi" ? "हि" : "म"}
              </button>
            ))}
          </div>
        </div>
      </div>
    </nav>
  );
}