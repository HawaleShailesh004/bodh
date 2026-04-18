"use client";

import Link from "next/link";
import { useApp } from "@/context/AppContext";
import { useAnalyze } from "@/hooks/useAnalyze";
import AnalyzeUpload from "@/components/AnalyzeUpload";
import AnalyzeScannerLoader from "@/components/AnalyzeScannerLoader";

export default function AnalyzePage() {
  const { lang, age, setAge, gender, setGender, elderly } = useApp();
  const { analyze, loading, stage, error } = useAnalyze();

  if (loading) return <AnalyzeScannerLoader stage={stage} />;

  return (
    <>
      <AnalyzeUpload
        lang={lang}
        elderly={elderly}
        age={age}
        setAge={setAge}
        gender={gender}
        setGender={setGender}
        error={error}
        onFile={analyze}
      />
      <p className="text-center text-sm text-slate-400 mt-3">
        Can&apos;t upload?{" "}
        <Link href="/manual" className="text-[#0D6B5E] underline">
          Enter values manually
        </Link>
      </p>
    </>
  );
}
