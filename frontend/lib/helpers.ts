import type { AnalysisResult, Biomarker, Lang, Severity } from "@/lib/types";
import { SEV } from "@/lib/constants";

export const cleanName = (name: string) =>
  name.replace(/\s*\d+\.?\d*\s*\/\s*(hpf|lpf)/gi, "").replace(/\s+0\.0\s*$/, "").trim();

export const fmtVal = (value: number, unit: string) => {
  const badUnit = /^\d+\.?\d*%$|^\d+$/.test(unit?.trim() || "");
  const safeUnit = badUnit ? "" : unit?.trim() || "";
  const num =
    value >= 100000 ? value.toLocaleString("en-IN") : value % 1 === 0 ? value.toString() : value >= 1 ? value.toFixed(1) : value.toFixed(4);
  return `${num}${safeUnit ? ` ${safeUnit}` : ""}`;
};

export const sevLabel = (severity: Severity, lang: Lang) =>
  lang === "hi" ? SEV[severity].hi : lang === "mr" ? SEV[severity].mr : SEV[severity].label;

export const explanationFor = (bio: Biomarker, lang: Lang) =>
  lang === "hi" ? bio.explanation_hi : lang === "mr" ? bio.explanation_mr : bio.explanation_en;

/** Ensures summary / doctor-question fields exist (e.g. older sessionStorage payloads). */
export function normalizeAnalysisResult(r: AnalysisResult): AnalysisResult {
  return {
    ...r,
    report_summary_en: r.report_summary_en ?? "",
    report_summary_hi: r.report_summary_hi ?? "",
    report_summary_mr: r.report_summary_mr ?? "",
    doctor_questions_en: r.doctor_questions_en ?? [],
    doctor_questions_hi: r.doctor_questions_hi ?? [],
    doctor_questions_mr: r.doctor_questions_mr ?? [],
    chat_questions_en: r.chat_questions_en ?? [],
    chat_questions_hi: r.chat_questions_hi ?? [],
    chat_questions_mr: r.chat_questions_mr ?? [],
  };
}

/** Same three lines as the "Questions to Ask Your Doctor" card (API or fallback). */
const DOCTOR_QUESTION_FALLBACK: Record<Lang, string[]> = {
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

export function doctorQuestionsForLang(result: AnalysisResult, lang: Lang): string[] {
  const r = normalizeAnalysisResult(result);
  const raw =
    lang === "hi" ? r.doctor_questions_hi : lang === "mr" ? r.doctor_questions_mr : r.doctor_questions_en;
  const apiQs = raw.filter((q) => q?.trim()).slice(0, 3);
  return apiQs.length === 3 ? apiQs : DOCTOR_QUESTION_FALLBACK[lang];
}

/** Bodh in-app chat starters (same Groq call as summary; not doctor-visit questions). */
const CHAT_QUESTION_FALLBACK: Record<Lang, string[]> = {
  en: [
    "Which value on my report should I understand first, in simple words?",
    "Why might my flagged results look this way on this lab sheet?",
    "Can you explain one term on my report that looks confusing?",
  ],
  hi: [
    "मेरी रिपोर्ट में सबसे पहले किस मान को सरल भाषा में समझना चाहिए?",
    "मेरे रिपोर्ट पर चिह्नित परिणाम ऐसे क्यों दिख सकते हैं?",
    "क्या आप मेरी रिपोर्ट का एक भ्रमित करने वाला शब्द समझा सकते हैं?",
  ],
  mr: [
    "माझ्या अहवालात प्रथम कोणते मूल्य सोप्या भाषेत समजून घ्यावे?",
    "माझ्या अहवालातील चिन्हांकित निकाल असे का दिसू शकतात?",
    "तुम्ही माझ्या अहवालातील एक गोंधळात टाकणारा शब्द स्पष्ट करू शकता का?",
  ],
};

export function chatQuestionsForLang(result: AnalysisResult, lang: Lang): string[] {
  const r = normalizeAnalysisResult(result);
  const raw =
    lang === "hi" ? r.chat_questions_hi : lang === "mr" ? r.chat_questions_mr : r.chat_questions_en;
  const apiQs = raw.filter((q) => q?.trim()).slice(0, 3);
  return apiQs.length === 3 ? apiQs : CHAT_QUESTION_FALLBACK[lang];
}

export const calcScore = (biomarkers: Biomarker[]) => {
  const scored = biomarkers.filter((b) => b.severity !== "UNKNOWN");
  if (!scored.length) return 100;
  const total = scored.reduce((acc, b) => acc + (b.severity === "NORMAL" ? 100 : b.severity === "WATCH" ? 60 : b.severity === "ACT_NOW" ? 20 : 0), 0);
  return Math.round(total / scored.length);
};
