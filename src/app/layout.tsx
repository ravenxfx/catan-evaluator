import "./globals.css";
import type { Metadata } from "next";
import Script from "next/script";

export const metadata: Metadata = {
  title: "Catan Evaluator",
  description: "Find and evaluate Catan boards.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const client = process.env.NEXT_PUBLIC_ADSENSE_CLIENT;

  return (
    <html lang="en">
      <head>
        {/* Google AdSense (loads only if client is set) */}
        {client ? (
          <Script
            async
            strategy="afterInteractive"
            src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${client}`}
            crossOrigin="anonymous"
          />
        ) : null}
      </head>

      <body className="min-h-[100dvh] bg-slate-50 text-slate-900">{children}</body>
    </html>
  );
}
