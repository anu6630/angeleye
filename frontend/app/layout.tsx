import type { Metadata } from "next";
import { DM_Sans, Fraunces } from "next/font/google";
import Script from "next/script";
import "./globals.css";
import { AppNavigation } from "@/components/layout/AppNavigation";
import { PendingAuthActionHandler } from "@/components/auth/PendingAuthActionHandler";

const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
});

export const metadata: Metadata = {
  title: "IdeaLit - Share and Remix Python Notebooks",
  description:
    "IdeaLit is a social platform for Python notebooks. Create, share, and fork computational knowledge.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${dmSans.variable} ${fraunces.variable}`}>
      <head>
        {/*
          Pyodide WASM runtime — loaded on page load.
          The editor's ensurePyodide() checks window.loadPyodide and surfaces a user-facing
          error if the CDN is unreachable.
        */}
        <Script
          src="https://cdn.jsdelivr.net/pyodide/v0.26.3/full/pyodide.js"
          strategy="lazyOnload"
        />
      </head>
      <body className="min-h-screen font-sans">
        <AppNavigation />
        <PendingAuthActionHandler />
        {children}
      </body>
    </html>
  );
}
