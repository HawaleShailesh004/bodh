"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { useApp } from "@/context/AppContext";
import { API_BASE } from "@/lib/constants";
import type { AnalysisResult } from "@/lib/types";
import { normalizeAnalysisResult } from "@/lib/helpers";
import { maybeCompressImageForUpload } from "@/lib/compressImage";

export function useAnalyze() {
  const router = useRouter();
  const { age, gender, setResult } = useApp();
  const [loading, setLoading] = useState(false);
  const [stage, setStage] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const analyze = useCallback(
    async (file: File) => {
      setLoading(true);
      setError(null);
      setStage(0);
      const timer = setInterval(() => setStage((s) => Math.min(s + 1, 4)), 2000);
      try {
        const uploadFile = await maybeCompressImageForUpload(file);
        const form = new FormData();
        form.append("file", uploadFile);
        form.append("age", age.toString());
        form.append("gender", gender);

        const res = await fetch(`${API_BASE}/api/analyze`, { method: "POST", body: form });
        clearInterval(timer);
        if (!res.ok) {
          const err = await res.json().catch(() => ({ detail: "Server error" }));
          throw new Error(err.detail || `Error ${res.status}`);
        }
        const data: AnalysisResult = await res.json();
        setStage(4);
        await new Promise((r) => setTimeout(r, 500));
        setResult(normalizeAnalysisResult(data));
        router.push("/results");
      } catch (e: unknown) {
        clearInterval(timer);
        setError(e instanceof Error ? e.message : "Something went wrong");
      } finally {
        setLoading(false);
      }
    },
    [age, gender, router, setResult],
  );

  return { analyze, loading, stage, error };
}
