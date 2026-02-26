// src/app/layout.tsx
import type { Metadata } from "next";
import Script from "next/script";
import "./globals.css";

export const metadata: Metadata = {
  title: "Catan Boards – Randomizer & Evaluator",
  description:
    "Find balanced Catan boards, randomize layouts, evaluate balance score, and reveal best starting positions.",
  keywords: [
    "Catan",
    "Settlers of Catan",
    "Catan board generator",
    "Catan randomizer",
    "Catan balance",
    "best starting positions Catan",
    "Catan map",
    "Catan board",
    "Catan strategy",
    "Catan pips",
    "Catan fair board",
    "Catan balanced board",
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        {/* AdSense loader (also used for ownership verification) */}
        <Script
          id="adsense"
          async
          strategy="afterInteractive"
          src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-4388511727175069"
          crossOrigin="anonymous"
        />
      </head>
      <body className="min-h-[100dvh] bg-slate-50 text-slate-900 overflow-x-hidden">
        {children}
      </body>
    </html>
  );
}