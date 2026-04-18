import { MessageSquare } from "lucide-react";
import type { AnalysisResult, Lang } from "@/lib/types";
import { doctorQuestionsForLang } from "@/lib/helpers";

const TITLES: Record<Lang, string> = {
  en: "3 Questions to Ask Your Doctor",
  hi: "डॉक्टर से पूछने के 3 सवाल",
  mr: "डॉक्टरांना विचारण्याचे 3 प्रश्न",
};

interface DoctorQuestionsProps {
  result: AnalysisResult;
  lang: Lang;
  elderly?: boolean;
}

export default function DoctorQuestions({ result, lang, elderly = false }: DoctorQuestionsProps) {
  const questionsList = doctorQuestionsForLang(result, lang);

  return (
    <div className="rounded-2xl border border-blue-100 bg-blue-50 p-5 shadow-sm">
      <div className={`mb-4 flex items-center gap-2.5 font-semibold text-blue-900 ${elderly ? "text-base" : "text-sm"}`}>
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-100">
          <MessageSquare size={14} className="text-blue-700" />
        </div>
        {TITLES[lang]}
      </div>
      <div className="space-y-3">
        {questionsList.map((q, i) => (
          <div key={i} className="flex gap-3">
            <span
              className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-blue-200 font-bold text-blue-800"
              style={{ fontSize: 10 }}
            >
              {i + 1}
            </span>
            <p className={`leading-relaxed text-blue-800 ${elderly ? "text-sm" : "text-xs"}`}>
              {'\u201c'}
              {q}
              {'\u201d'}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}