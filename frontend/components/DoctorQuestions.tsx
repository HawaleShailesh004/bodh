import { MessageSquare } from "lucide-react";
import type { AnalysisResult, Lang } from "@/lib/types";
import { doctorQuestionsForLang } from "@/lib/helpers";

const TITLES: Record<Lang, string> = {
  en: "3 Questions to Ask Your Doctor",
  hi: "डॉक्टर से पूछने के 3 सवाल",
  mr: "डॉक्टरांना विचारण्याचे 3 प्रश्न",
};

interface Props {
  result: AnalysisResult;
  lang: Lang;
  elderly?: boolean;
}

export default function DoctorQuestions({ result, lang, elderly = false }: Props) {
  const questions = doctorQuestionsForLang(result, lang);
  if (!questions.length) return null;

  return (
    <div
      className="rounded-2xl p-5"
      style={{
        background: "#EFF6FF",
        border: "1.5px solid #BFDBFE",
        boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
      }}
    >
      {/* Header */}
      <div className={`mb-4 flex items-center gap-2.5 font-semibold text-blue-900 ${elderly ? "text-base" : "text-sm"}`}>
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-100">
          <MessageSquare size={14} className="text-blue-700" />
        </div>
        {TITLES[lang]}
      </div>

      {/* Questions */}
      <div className="space-y-3.5">
        {questions.map((q, i) => (
          <div key={i} className="flex gap-3 items-start">
            {/* Number circle */}
            <span
              className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-blue-200 font-bold text-blue-800 leading-none"
              style={{ fontSize: 11 }}
            >
              {i + 1}
            </span>
            {/* Question — quoted, italic */}
            <p className={`leading-relaxed text-blue-800 italic ${elderly ? "text-sm" : "text-xs"}`}>
              &ldquo;{q}&rdquo;
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}