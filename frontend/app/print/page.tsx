"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Printer, Stethoscope } from "lucide-react";
import type { AnalysisResult } from "@/lib/types";
import { normalizeAnalysisResult } from "@/lib/helpers";
import { BODH_PRINT_SNAPSHOT_KEY } from "@/lib/constants";

const SEVERITY_SYMBOL: Record<string, string> = {
  EMERGENCY: "!! CRITICAL",
  ACT_NOW:   "! ABNORMAL",
  WATCH:     "~ BORDERLINE",
  NORMAL:    "OK NORMAL",
  UNKNOWN:   "? UNVERIFIED",
};

export default function PrintPage() {
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const router = useRouter();

  useEffect(() => {
    // New tabs opened from Results have empty sessionStorage; snapshot is in localStorage.
    const fromPrintTab = localStorage.getItem(BODH_PRINT_SNAPSHOT_KEY);
    const fromSession = sessionStorage.getItem("bodh_result");
    const raw = fromPrintTab ?? fromSession;
    if (!raw) {
      router.replace("/analyze");
      return;
    }
    try {
      const data = normalizeAnalysisResult(JSON.parse(raw) as AnalysisResult);
      setResult(data);
    } catch {
      router.replace("/analyze");
      return;
    }
    setTimeout(() => window.print(), 600);
  }, [router]);

  if (!result) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh", fontFamily: "Georgia, serif", color: "#374151" }}>
      Loading report...
    </div>
  );

  const abnormal = result.biomarkers.filter(b => b.severity !== "NORMAL" && b.severity !== "UNKNOWN");
  const normal   = result.biomarkers.filter(b => b.severity === "NORMAL");
  const unknown  = result.biomarkers.filter(b => b.severity === "UNKNOWN");
  const date     = new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "long", year: "numeric" });

  return (
    <>
      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: "Arial", sans-serif; font-size: 12px; color: #111; background: white; }
        
        .no-print { display: block; }
        
        @media print {
          .no-print { display: none !important; }
          body { font-size: 11px; }
          .page-break { page-break-before: always; }
          @page { margin: 18mm 16mm; }
        }
        
        table { width: 100%; border-collapse: collapse; }
        th { background: #f3f4f6; font-weight: 700; text-align: left; padding: 7px 10px; border: 1px solid #d1d5db; font-size: 11px; text-transform: uppercase; letter-spacing: 0.04em; }
        td { padding: 6px 10px; border: 1px solid #e5e7eb; vertical-align: top; }
        tr:nth-child(even) td { background: #fafafa; }
        
        .critical td { background: #fef2f2 !important; }
        .act-now  td { background: #fff7ed !important; }
        .watch    td { background: #fffbeb !important; }
        .critical .status { font-weight: 700; color: #991b1b; }
        .act-now  .status { font-weight: 700; color: #9a3412; }
        .watch    .status { font-weight: 600; color: #92400e; }
        .normal   .status { color: #166534; }
        
        .value-cell { font-family: "Courier New", monospace; font-weight: 700; font-size: 13px; }
        .loinc { font-family: "Courier New", monospace; font-size: 10px; color: #6b7280; }
      `}</style>

      {/* Screen-only toolbar */}
      <div className="no-print" style={{ background: "#0D6B5E", padding: "12px 24px", display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
        <button
          type="button"
          onClick={() => window.print()}
          style={{ background: "white", color: "#0D6B5E", border: "none", borderRadius: 8, padding: "8px 20px", fontWeight: 700, fontSize: 13, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 8 }}
        >
          <Printer size={16} strokeWidth={2} aria-hidden />
          Print / Save as PDF
        </button>
        <button
          type="button"
          onClick={() => router.back()}
          style={{ background: "transparent", color: "white", border: "1px solid rgba(255,255,255,0.4)", borderRadius: 8, padding: "8px 16px", fontSize: 13, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 6 }}
        >
          <ArrowLeft size={16} strokeWidth={2} aria-hidden />
          Back
        </button>
        <span style={{ color: "rgba(255,255,255,0.7)", fontSize: 12 }}>
          {"For best results: File > Print > Save as PDF"}
        </span>
      </div>

      {/* Printable document */}
      <div style={{ maxWidth: 800, margin: "0 auto", padding: "24px 20px" }}>

        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20, paddingBottom: 14, borderBottom: "2px solid #111" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
              <svg width="20" height="14" viewBox="0 0 24 16" fill="none">
                <polyline points="0,8 4,8 6,2 9,14 12,0 15,10 17,8 24,8" stroke="#111" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              <span style={{ fontFamily: "Georgia, serif", fontWeight: 700, fontSize: 18 }}>Bodh</span>
              <span style={{ fontSize: 11, color: "#6b7280" }}>AI Health Report Summary</span>
            </div>
            <div style={{ fontSize: 11, color: "#6b7280" }}>
              Generated: {date} · Report ID: {result.report_id.slice(0, 8).toUpperCase()} · {result.total_biomarkers} values analyzed
            </div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 10, color: "#6b7280", marginBottom: 2 }}>Overall Assessment</div>
            <div style={{ fontSize: 16, fontWeight: 700, fontFamily: "Georgia, serif" }}>
              {result.overall_severity.replace("_", " ")}
            </div>
          </div>
        </div>

        {/* AI Summary */}
        {result.report_summary_en && (
          <div style={{ marginBottom: 18, padding: "12px 14px", border: "1px solid #d1d5db", borderRadius: 6, background: "#f9fafb" }}>
            <div style={{ fontWeight: 700, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 6 }}>Summary</div>
            <p style={{ lineHeight: 1.6, color: "#374151" }}>{result.report_summary_en}</p>
          </div>
        )}

        {/* Specialist recommendation */}
        {result.specialist_recommendation && (
          <div style={{ marginBottom: 18, padding: "10px 14px", border: "1.5px solid #111", borderRadius: 6, display: "flex", gap: 10 }}>
            <span style={{ fontWeight: 700 }}>Recommended Action:</span>
            <span>Consult <strong>{result.specialist_recommendation}</strong> — {result.urgency_timeline}</span>
          </div>
        )}

        {/* Abnormal values table */}
        {abnormal.length > 0 && (
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontWeight: 700, fontSize: 12, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 8, display: "flex", alignItems: "center", gap: 8 }}>
              <span>Values Requiring Attention</span>
              <span style={{ fontWeight: 400, fontSize: 11, color: "#6b7280" }}>({abnormal.length})</span>
            </div>
            <table>
              <thead>
                <tr>
                  <th style={{ width: "28%" }}>Test Name</th>
                  <th style={{ width: "13%" }}>Result</th>
                  <th style={{ width: "13%" }}>Unit</th>
                  <th style={{ width: "18%" }}>Normal Range</th>
                  <th style={{ width: "16%" }}>Status</th>
                  <th style={{ width: "12%" }}>Std. name</th>
                </tr>
              </thead>
              <tbody>
                {abnormal.map((b, i) => {
                  const rowClass = b.severity === "EMERGENCY" ? "critical" : b.severity === "ACT_NOW" ? "act-now" : "watch";
                  const range = b.active_ref_low != null && b.active_ref_high != null
                    ? `${b.active_ref_low} – ${b.active_ref_high}`
                    : "—";
                  const unit = /^\d+\.?\d*%$|^\d+$/.test(b.unit?.trim() || "") ? "" : b.unit;
                  return (
                    <tr key={i} className={rowClass}>
                      <td style={{ fontWeight: 600 }}>{b.raw_name}</td>
                      <td className="value-cell">{b.value}</td>
                      <td>{unit || "—"}</td>
                      <td>{range}</td>
                      <td className="status">{SEVERITY_SYMBOL[b.severity]}</td>
                      <td className="loinc">{b.normalized_name || "—"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Normal values table */}
        {normal.length > 0 && (
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontWeight: 700, fontSize: 12, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 8 }}>
              Normal Values ({normal.length})
            </div>
            <table>
              <thead>
                <tr>
                  <th style={{ width: "28%" }}>Test Name</th>
                  <th style={{ width: "13%" }}>Result</th>
                  <th style={{ width: "13%" }}>Unit</th>
                  <th style={{ width: "18%" }}>Normal Range</th>
                  <th style={{ width: "16%" }}>Status</th>
                  <th style={{ width: "12%" }}>Std. name</th>
                </tr>
              </thead>
              <tbody>
                {normal.map((b, i) => {
                  const range = b.active_ref_low != null && b.active_ref_high != null
                    ? `${b.active_ref_low} – ${b.active_ref_high}` : "—";
                  const unit = /^\d+\.?\d*%$|^\d+$/.test(b.unit?.trim() || "") ? "" : b.unit;
                  return (
                    <tr key={i} className="normal">
                      <td>{b.raw_name}</td>
                      <td className="value-cell">{b.value}</td>
                      <td>{unit || "—"}</td>
                      <td>{range}</td>
                      <td className="status">OK NORMAL</td>
                      <td className="loinc">{b.normalized_name || "—"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Unverified values */}
        {unknown.length > 0 && (
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontWeight: 700, fontSize: 12, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 8 }}>
              ? Unverified Values ({unknown.length}) — No Reference Range Available
            </div>
            <table>
              <thead>
                <tr>
                  <th style={{ width: "40%" }}>Test Name</th>
                  <th style={{ width: "20%" }}>Result</th>
                  <th style={{ width: "20%" }}>Unit</th>
                  <th style={{ width: "20%" }}>Note</th>
                </tr>
              </thead>
              <tbody>
                {unknown.map((b, i) => (
                  <tr key={i}>
                    <td>{b.raw_name}</td>
                    <td className="value-cell">{b.value}</td>
                    <td>{b.unit || "—"}</td>
                    <td style={{ color: "#6b7280", fontSize: 10 }}>Verify with lab reference</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Doctor questions */}
        {result.doctor_questions_en?.length > 0 && (
          <div style={{ marginBottom: 20, padding: "12px 14px", border: "1px solid #d1d5db", borderRadius: 6 }}>
            <div style={{ fontWeight: 700, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 8 }}>
              Suggested Questions for Your Doctor
            </div>
            {result.doctor_questions_en.map((q, i) => (
              <div key={i} style={{ display: "flex", gap: 8, marginBottom: 5 }}>
                <span style={{ fontWeight: 700, color: "#6b7280" }}>{i + 1}.</span>
                <span style={{ lineHeight: 1.5 }}>{q}</span>
              </div>
            ))}
          </div>
        )}

        {/* Processing info */}
        <div style={{ marginBottom: 16, fontSize: 10, color: "#9ca3af", display: "flex", gap: 16 }}>
          <span>Processed in {(result.processing_time_ms / 1000).toFixed(1)}s</span>
          <span>Extraction: Azure Document Intelligence + Groq Llama 3.3</span>
          <span>Verification: ICMR Indian population guidelines</span>
          {result.ai_diverged && <span>Conservative interpretation used (AI divergence detected)</span>}
        </div>

        {/* Footer */}
        <div style={{ borderTop: "1px solid #d1d5db", paddingTop: 12, fontSize: 10, color: "#6b7280", lineHeight: 1.6 }}>
          <span style={{ display: "inline-flex", alignItems: "flex-start", gap: 6 }}>
            <Stethoscope size={12} strokeWidth={2} style={{ flexShrink: 0, marginTop: 2, color: "#111" }} aria-hidden />
            <span>
              <strong style={{ color: "#111" }}>Medical Disclaimer:</strong>{" "}
              This report was generated by Bodh, an AI-powered health literacy tool. It is intended to assist patients in understanding their lab results and is NOT a substitute for professional medical advice, diagnosis, or treatment. All values and interpretations should be reviewed by a qualified physician. Reference ranges may vary by laboratory and patient demographics. Severity classifications are based on ICMR Indian population guidelines and may differ from the laboratory’s own reference ranges.
            </span>
          </span>
        </div>
      </div>
    </>
  );
}