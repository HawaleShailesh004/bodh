"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2, FlaskConical, AlertCircle, Stethoscope } from "lucide-react";
import Navbar from "@/components/Navbar";
import { useApp } from "@/context/AppContext";
import type { AnalysisResult } from "@/lib/types";
import { normalizeAnalysisResult } from "@/lib/helpers";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

interface Row {
  id: number;
  name: string;
  value: string;
  unit: string;
  ref_low: string;
  ref_high: string;
}

const COMMON_BIOMARKERS = [
  { name: "Haemoglobin",    unit: "g/dL",       ref_low: "13.5", ref_high: "17.5" },
  { name: "WBC Count",      unit: "/cumm",       ref_low: "4000", ref_high: "11000" },
  { name: "Platelet Count", unit: "/cumm",       ref_low: "150000", ref_high: "450000" },
  { name: "RBC Count",      unit: "million/cumm",ref_low: "4.5", ref_high: "5.5" },
  { name: "PCV",            unit: "%",           ref_low: "40",  ref_high: "50" },
  { name: "MCV",            unit: "fL",          ref_low: "80",  ref_high: "100" },
  { name: "MCH",            unit: "pg",          ref_low: "27",  ref_high: "32" },
  { name: "MCHC",           unit: "%",           ref_low: "31",  ref_high: "36" },
  { name: "TSH",            unit: "uIU/mL",      ref_low: "0.4", ref_high: "4.0" },
  { name: "ALT/SGPT",       unit: "U/L",         ref_low: "7",   ref_high: "56" },
  { name: "AST/SGOT",       unit: "U/L",         ref_low: "10",  ref_high: "40" },
  { name: "Creatinine",     unit: "mg/dL",       ref_low: "0.7", ref_high: "1.4" },
  { name: "HbA1c",          unit: "%",           ref_low: "4",   ref_high: "5.7" },
  { name: "Total Cholesterol", unit: "mg/dL",    ref_low: "0",   ref_high: "200" },
  { name: "LDL Cholesterol",   unit: "mg/dL",    ref_low: "0",   ref_high: "100" },
];

let nextId = 1;
const makeRow = (preset?: (typeof COMMON_BIOMARKERS)[0]): Row => ({
  id: nextId++,
  name:      preset?.name      ?? "",
  unit:      preset?.unit      ?? "",
  ref_low:   preset?.ref_low   ?? "",
  ref_high:  preset?.ref_high  ?? "",
  value: "",
});

export default function ManualEntryPage() {
  const { lang, setLang, age, setAge, gender, setGender, setResult, elderly } = useApp();
  const router  = useRouter();
  const [rows, setRows]     = useState<Row[]>([makeRow(), makeRow(), makeRow()]);
  const [loading, setLoading] = useState(false);
  const [error, setError]   = useState<string | null>(null);

  const updateRow = (id: number, field: keyof Row, val: string) => {
    setRows(prev => prev.map(r => r.id === id ? { ...r, [field]: val } : r));
  };

  const addRow = () => setRows(prev => [...prev, makeRow()]);

  const removeRow = (id: number) => {
    if (rows.length <= 1) return;
    setRows(prev => prev.filter(r => r.id !== id));
  };

  const addPreset = (preset: typeof COMMON_BIOMARKERS[0]) => {
    setRows(prev => [...prev, makeRow(preset)]);
  };

  const handleSubmit = useCallback(async () => {
    const valid = rows.filter(r => r.name.trim() && r.value.trim() && !isNaN(Number(r.value)));
    if (valid.length === 0) {
      setError("Add at least one biomarker with a name and numeric value.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const payload = {
        age,
        gender,
        biomarkers: valid.map(r => ({
          name:      r.name.trim(),
          value:     parseFloat(r.value),
          unit:      r.unit.trim() || "units",
          ref_low:   r.ref_low  ? parseFloat(r.ref_low)  : null,
          ref_high:  r.ref_high ? parseFloat(r.ref_high) : null,
        })),
      };
      const res = await fetch(`${API}/api/analyze/manual`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: "Server error" }));
        throw new Error(err.detail ?? `Error ${res.status}`);
      }
      const data: AnalysisResult = await res.json();
      setResult(normalizeAnalysisResult(data));
      router.push("/results");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }, [rows, age, gender, setResult, router]);

  const LABELS = {
    title:       { en: "Enter values manually",      hi: "मान मैन्युअल दर्ज करें",     mr: "मूल्ये मॅन्युअल प्रविष्ट करा" },
    subtitle:    { en: "Type in biomarker values from your report", hi: "रिपोर्ट से बायोमार्कर मान दर्ज करें", mr: "अहवालातील बायोमार्कर मूल्ये टाइप करा" },
    name:        { en: "Biomarker name",  hi: "बायोमार्कर नाम",    mr: "बायोमार्कर नाव" },
    value:       { en: "Your value",      hi: "आपका मान",          mr: "तुमचे मूल्य" },
    unit:        { en: "Unit",            hi: "इकाई",              mr: "एकक" },
    low:         { en: "Normal low",      hi: "सामान्य न्यूनतम",   mr: "सामान्य किमान" },
    high:        { en: "Normal high",     hi: "सामान्य अधिकतम",    mr: "सामान्य कमाल" },
    addRow:      { en: "Add row",         hi: "पंक्ति जोड़ें",      mr: "ओळ जोडा" },
    analyze:     { en: "Analyze",         hi: "विश्लेषण करें",      mr: "विश्लेषण करा" },
    analyzing:   { en: "Analyzing...",    hi: "विश्लेषण हो रहा है...", mr: "विश्लेषण होत आहे..." },
    common:      { en: "Quick add",       hi: "जल्दी जोड़ें",       mr: "झटपट जोडा" },
    age:         { en: "Age",             hi: "आयु",               mr: "वय" },
    gender:      { en: "Gender",          hi: "लिंग",              mr: "लिंग" },
    male:        { en: "Male",            hi: "पुरुष",             mr: "पुरुष" },
    female:      { en: "Female",          hi: "महिला",             mr: "महिला" },
    orUpload:    { en: "or upload a PDF/photo instead", hi: "या PDF/फोटो अपलोड करें", mr: "किंवा PDF/फोटो अपलोड करा" },
  };
  const l = (key: keyof typeof LABELS) => LABELS[key][lang];

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar lang={lang} setLang={setLang} backHref="/analyze" backLabel="Upload instead" />

      <main className="mx-auto w-full max-w-3xl px-4 py-8">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-2.5 mb-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#0D6B5E]/10">
              <FlaskConical size={18} className="text-[#0D6B5E]" />
            </div>
            <h1 className={`font-bold text-slate-900 ${elderly ? "text-2xl" : "text-xl"}`}
              style={{ fontFamily: "Georgia, serif" }}>
              {l("title")}
            </h1>
          </div>
          <p className={`text-slate-500 ${elderly ? "text-base" : "text-sm"}`}>{l("subtitle")}</p>
          <button
            onClick={() => router.push("/analyze")}
            className={`mt-2 text-[#0D6B5E] underline underline-offset-2 ${elderly ? "text-sm" : "text-xs"}`}
          >
            {l("orUpload")}
          </button>
        </div>

        {/* Patient context */}
        <div className="flex gap-3 mb-5">
          <div className="flex-1">
            <label className={`block font-semibold text-slate-500 uppercase tracking-wide mb-1.5 ${elderly ? "text-sm" : "text-xs"}`}>{l("age")}</label>
            <input type="number" value={age} min={1} max={120} onChange={e => setAge(Number(e.target.value))}
              className={`w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-slate-900 focus:outline-none focus:border-[#0D6B5E] focus:ring-1 focus:ring-[#0D6B5E]/20 ${elderly ? "text-base" : "text-sm"}`}/>
          </div>
          <div className="flex-1">
            <label className={`block font-semibold text-slate-500 uppercase tracking-wide mb-1.5 ${elderly ? "text-sm" : "text-xs"}`}>{l("gender")}</label>
            <select value={gender} onChange={e => setGender(e.target.value as "male"|"female")}
              className={`w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-slate-900 focus:outline-none focus:border-[#0D6B5E] cursor-pointer ${elderly ? "text-base" : "text-sm"}`}>
              <option value="male">{l("male")}</option>
              <option value="female">{l("female")}</option>
            </select>
          </div>
        </div>

        {/* Quick add presets */}
        <div className="mb-4">
          <div className={`font-semibold text-slate-500 uppercase tracking-wide mb-2 ${elderly ? "text-sm" : "text-[10px]"}`}>{l("common")}</div>
          <div className="flex flex-wrap gap-1.5">
            {COMMON_BIOMARKERS.map((b, i) => (
              <button key={i} onClick={() => addPreset(b)}
                className={`rounded-full border border-slate-200 bg-white px-2.5 py-1 font-medium text-slate-600 hover:border-[#0D6B5E] hover:text-[#0D6B5E] transition-colors ${elderly ? "text-sm" : "text-[11px]"}`}>
                + {b.name}
              </button>
            ))}
          </div>
        </div>

        {/* Table */}
        <div className="rounded-2xl border border-slate-100 bg-white shadow-sm overflow-hidden mb-4">
          {/* Column headers */}
          <div className="grid grid-cols-[2fr_1fr_1fr_1fr_1fr_auto] gap-2 px-4 py-2 bg-slate-50 border-b border-slate-100">
            {[l("name"), l("value"), l("unit"), l("low"), l("high"), ""].map((h, i) => (
              <div key={i} className={`font-semibold text-slate-400 uppercase tracking-wide ${elderly ? "text-xs" : "text-[10px]"}`}>{h}</div>
            ))}
          </div>

          {/* Rows */}
          <div className="divide-y divide-slate-50">
            {rows.map((row, idx) => (
              <div key={row.id} className="grid grid-cols-[2fr_1fr_1fr_1fr_1fr_auto] gap-2 px-4 py-2.5 items-center">
                {/* Name with datalist */}
                <div className="relative">
                  <input
                    list={`biomarkers-${row.id}`}
                    value={row.name}
                    onChange={e => updateRow(row.id, "name", e.target.value)}
                    placeholder="e.g. Haemoglobin"
                    className={`w-full rounded-lg border border-slate-200 px-2.5 py-1.5 text-slate-900 placeholder-slate-300 focus:outline-none focus:border-[#0D6B5E] ${elderly ? "text-sm" : "text-xs"}`}
                  />
                  <datalist id={`biomarkers-${row.id}`}>
                    {COMMON_BIOMARKERS.map(b => <option key={b.name} value={b.name}/>)}
                  </datalist>
                </div>
                {/* Value */}
                <input type="number" step="any" value={row.value}
                  onChange={e => updateRow(row.id, "value", e.target.value)}
                  placeholder="0.0"
                  className={`w-full rounded-lg border border-slate-200 px-2.5 py-1.5 text-slate-900 font-mono placeholder-slate-300 focus:outline-none focus:border-[#0D6B5E] ${elderly ? "text-sm" : "text-xs"}`}
                />
                {/* Unit */}
                <input value={row.unit}
                  onChange={e => updateRow(row.id, "unit", e.target.value)}
                  placeholder="g/dL"
                  className={`w-full rounded-lg border border-slate-200 px-2.5 py-1.5 text-slate-900 placeholder-slate-300 focus:outline-none focus:border-[#0D6B5E] ${elderly ? "text-sm" : "text-xs"}`}
                />
                {/* Ref low */}
                <input type="number" step="any" value={row.ref_low}
                  onChange={e => updateRow(row.id, "ref_low", e.target.value)}
                  placeholder="low"
                  className={`w-full rounded-lg border border-slate-200 px-2.5 py-1.5 text-slate-900 font-mono placeholder-slate-300 focus:outline-none focus:border-emerald-400 ${elderly ? "text-sm" : "text-xs"}`}
                />
                {/* Ref high */}
                <input type="number" step="any" value={row.ref_high}
                  onChange={e => updateRow(row.id, "ref_high", e.target.value)}
                  placeholder="high"
                  className={`w-full rounded-lg border border-slate-200 px-2.5 py-1.5 text-slate-900 font-mono placeholder-slate-300 focus:outline-none focus:border-emerald-400 ${elderly ? "text-sm" : "text-xs"}`}
                />
                {/* Delete */}
                <button onClick={() => removeRow(row.id)}
                  className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-300 hover:bg-red-50 hover:text-red-400 transition-colors">
                  <Trash2 size={13}/>
                </button>
              </div>
            ))}
          </div>

          {/* Add row */}
          <div className="px-4 py-3 border-t border-slate-50">
            <button onClick={addRow}
              className={`flex items-center gap-2 text-[#0D6B5E] font-medium hover:underline ${elderly ? "text-sm" : "text-xs"}`}>
              <Plus size={13}/> {l("addRow")}
            </button>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="mb-4 flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 px-4 py-3">
            <AlertCircle size={15} className="text-red-500 flex-shrink-0 mt-0.5"/>
            <p className={`text-red-700 ${elderly ? "text-sm" : "text-xs"}`}>{error}</p>
          </div>
        )}

        {/* Submit */}
        <button
          onClick={handleSubmit}
          disabled={loading}
          className={`w-full rounded-2xl bg-[#0D6B5E] py-4 font-bold text-white shadow-sm transition-all hover:bg-[#0a5a4e] disabled:opacity-50 disabled:cursor-not-allowed ${elderly ? "text-base" : "text-sm"}`}
        >
          {loading ? l("analyzing") : l("analyze")}
        </button>

        <p className={`mt-3 flex items-center justify-center gap-2 text-center text-slate-400 ${elderly ? "text-sm" : "text-xs"}`}>
          <Stethoscope size={14} className="shrink-0 text-slate-400" strokeWidth={2} aria-hidden />
          <span>
            {lang === "hi" ? "यह AI विश्लेषण है, चिकित्सकीय सलाह नहीं।" : lang === "mr" ? "हे AI विश्लेषण आहे, वैद्यकीय सल्ला नाही." : "This is AI analysis, not medical advice. Always consult a doctor."}
          </span>
        </p>
      </main>
    </div>
  );
}