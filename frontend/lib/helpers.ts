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
  };
}

export const calcScore = (biomarkers: Biomarker[]) => {
  const scored = biomarkers.filter((b) => b.severity !== "UNKNOWN");
  if (!scored.length) return 100;
  const total = scored.reduce((acc, b) => acc + (b.severity === "NORMAL" ? 100 : b.severity === "WATCH" ? 60 : b.severity === "ACT_NOW" ? 20 : 0), 0);
  return Math.round(total / scored.length);
};
