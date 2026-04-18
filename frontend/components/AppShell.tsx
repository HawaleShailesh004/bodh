"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { useApp } from "@/context/AppContext";
import Navbar from "@/components/Navbar";
import SiteFooter from "@/components/SiteFooter";

export default function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname() ?? "";
  const { lang, setLang } = useApp();

  const isAnalyze = pathname === "/analyze" || pathname.startsWith("/analyze/");
  const isResults = pathname === "/results" || pathname.startsWith("/results/");

  const navProps = isResults
    ? { backHref: "/analyze" as const, backLabel: "← New Report" as const }
    : isAnalyze
      ? { backHref: "/" as const, backLabel: "← Home" as const }
      : {};

  return (
    <div className="flex min-h-screen flex-col bg-[#FAFAFA]">
      <Navbar lang={lang} setLang={setLang} {...navProps} />
      <div className="flex flex-1 flex-col">{children}</div>
      <SiteFooter />
    </div>
  );
}
