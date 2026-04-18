"use client";

import { useRouter } from "next/navigation";
import { useApp } from "@/context/AppContext";
import LandingPage from "@/components/LandingPage";

/**
 * Home: marketing landing only. Upload → `/analyze`, results → `/results`
 * (see `hooks/useAnalyze`, `app/analyze/page.tsx`, `app/results/page.tsx`).
 */
export default function HomePage() {
  const router = useRouter();
  const { lang } = useApp();

  return <LandingPage lang={lang} onStart={() => router.push("/analyze")} />;
}
