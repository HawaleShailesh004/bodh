import type { ReactNode } from "react";
import type { Metadata } from "next";
import "./globals.css";
import Providers from "@/app/providers";

export const metadata: Metadata = {
  title: "Bodh — Understand Your Lab Report",
  description: "AI-powered medical report explainer for Indian patients.",
  icons: {
    icon: "/brand/bodh-app-icon.svg",
    shortcut: "/brand/bodh-app-icon.svg",
    apple: "/brand/bodh-app-icon.svg",
  },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className="min-h-screen bg-[#FAFAFA] text-slate-900 antialiased"
        suppressHydrationWarning
      >
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}