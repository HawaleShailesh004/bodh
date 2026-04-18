"use client";

import { createContext, useContext, useState, ReactNode } from "react";
import type { Lang, AnalysisResult } from "@/lib/types";

interface AppContextType {
  lang: Lang;
  setLang: (l: Lang) => void;
  age: number;
  setAge: (n: number) => void;
  gender: "male" | "female";
  setGender: (g: "male" | "female") => void;
  result: AnalysisResult | null;
  setResult: (r: AnalysisResult | null) => void;
  elderly: boolean;
  setElderly: (e: boolean) => void;
}

const AppContext = createContext<AppContextType | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [lang, setLang]       = useState<Lang>("en");
  const [age, setAge]         = useState(35);
  const [gender, setGender]   = useState<"male" | "female">("male");
  const [result, setResult]   = useState<AnalysisResult | null>(null);
  const [elderly, setElderly] = useState(false);

  const handleSetResult = (r: AnalysisResult | null) => {
    setResult(r);
    if (r) sessionStorage.setItem("bodh_result", JSON.stringify(r));
    else sessionStorage.removeItem("bodh_result");
  };

  return (
    <AppContext.Provider value={{
      lang, setLang,
      age, setAge,
      gender, setGender,
      result, setResult: handleSetResult,
      elderly, setElderly,
    }}>
      {children}
    </AppContext.Provider>
  );
}

export const useApp = () => {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be inside AppProvider");
  return ctx;
};