"use client";

import { ReactNode } from "react";
import { AppProvider } from "@/context/AppContext";
import AppShell from "@/components/AppShell";

export default function Providers({ children }: { children: ReactNode }) {
  return (
    <AppProvider>
      <AppShell>{children}</AppShell>
    </AppProvider>
  );
}
