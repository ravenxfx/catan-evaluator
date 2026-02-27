import type { Metadata } from "next";
import Script from "next/script";
import "./globals.css";

export const metadata: Metadata = {
  title: "Catan Boards — Fair Board Generator & Evaluator",
  description:
    "Generate fair Settlers of Catan boards, evaluate balance, and reveal best starting positions. Find more even Catan setups with AI Super Search.",
  keywords: [
    "catan board generator",
    "catan randomizer",
    "settlers of catan board",
    "balanced catan board",
    "fair catan setup",
    "best starting positions catan",
    "catan pips",
    "catan map generator",
    "catan board evaluator",
  ],
  metadataBase: new URL("https://catan-boards.com"),
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        {/* ✅ AdSense verification snippet (what AdSense asks for) */}
        <Script
          async
          strategy="afterInteractive"
          src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-4388511727175069"
          crossOrigin="anonymous"
        />
        {/* Optional but helpful */}
        <meta name="google-adsense-account" content="ca-pub-4388511727175069" />
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
      </head>

      <body className="min-h-dvh bg-slate-50 text-slate-900 antialiased">{children}</body>
    </html>
  );
}