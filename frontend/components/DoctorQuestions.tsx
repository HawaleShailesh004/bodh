import { MessageSquare } from "lucide-react";
import type { AnalysisResult, Lang } from "@/lib/types";

const FALLBACK_QUESTIONS: Record<Lang, string[]> = {
  en: [
    "What is the most important abnormality in my report and what could be causing it?",
    "When should I retest, and which values should I monitor closely?",
    "Should I see a specialist, and what lifestyle changes should I make now?",
  ],
  hi: [
    "मेरी रिपोर्ट की सबसे महत्वपूर्ण असामान्यता क्या है और इसका कारण क्या हो सकता है?",
    "मुझे अगली जाँच कब करवानी चाहिए और किन मानों पर ध्यान देना है?",
    "क्या मुझे किसी विशेषज्ञ को दिखाना चाहिए और अभी क्या बदलना चाहिए?",
  ],
  mr: [
    "माझ्या अहवालातील सर्वात महत्त्वाची असामान्यता कोणती आणि त्याचे कारण काय असू शकते?",
    "पुन्हा चाचणी कधी करावी आणि कोणत्या मूल्यांवर लक्ष ठेवावे?",
    "मला तज्ञ डॉक्टरांना भेटण्याची गरज आहे का आणि आत्ता काय बदलावे?",
  ],
};

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
  const raw =
    lang === "hi"
      ? result.doctor_questions_hi
      : lang === "mr"
        ? result.doctor_questions_mr
        : result.doctor_questions_en;
  const apiQs = raw.filter((q) => q?.trim()).slice(0, 3);
  const questionsList = apiQs.length === 3 ? apiQs : FALLBACK_QUESTIONS[lang];

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