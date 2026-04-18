export type Lang = "en" | "hi" | "mr";
export type Severity = "NORMAL" | "WATCH" | "ACT_NOW" | "EMERGENCY" | "UNKNOWN";

export interface Biomarker {
  raw_name: string;
  normalized_name: string | null;
  value: number;
  unit: string;
  lab_ref_low: number | null;
  lab_ref_high: number | null;
  active_ref_low: number | null;
  active_ref_high: number | null;
  range_source: string;
  severity: Severity;
  deviation_score: number;
  needs_manual_review: boolean;
  extraction_confidence: number;
  explanation_en: string;
  explanation_hi: string;
  explanation_mr: string;
  diet_tip_en: string | null;
  diet_tip_hi: string | null;
}

export interface AnalysisResult {
  report_id: string;
  overall_severity: Severity;
  biomarkers: Biomarker[];
  specialist_recommendation: string | null;
  urgency_timeline: string | null;
  emergency_message: string | null;
  ai_diverged: boolean;
  processing_time_ms: number;
  total_biomarkers: number;
  recognized_biomarkers?: number;
  unknown_biomarkers: number;
  flagged_for_review: string[];
  /** Populated by backend `generate_report_summary` (empty when unavailable) */
  report_summary_en: string;
  report_summary_hi: string;
  report_summary_mr: string;
  doctor_questions_en: string[];
  doctor_questions_hi: string[];
  doctor_questions_mr: string[];
  /** AI-generated tap-to-ask prompts for Bodh chat (not the doctor-visit list) */
  chat_questions_en: string[];
  chat_questions_hi: string[];
  chat_questions_mr: string[];
}