import type { Lang } from "@/lib/types";

export default function LangToggle({ lang, setLang }: { lang: Lang; setLang: (lang: Lang) => void }) {
  return (
    <div className="flex gap-1 rounded-full bg-slate-200 p-1">
      {(["en", "hi", "mr"] as Lang[]).map((l) => (
        <button
          key={l}
          onClick={() => setLang(l)}
          className={`rounded-full px-3 py-1 text-xs font-semibold ${lang === l ? "bg-[#0D6B5E] text-white" : "text-slate-600"}`}
        >
          {l === "en" ? "EN" : l === "hi" ? "हि" : "म"}
        </button>
      ))}
    </div>
  );
}
