"use client";

import React from "react";

declare global {
  interface Window {
    adsbygoogle?: any[];
  }
}

export function AdSenseSlot({
  slot,
  format = "auto",
  responsive = true,
  className = "",
  style,
}: {
  slot: string; // ca-pub Slot-ID
  format?: string;
  responsive?: boolean;
  className?: string;
  style?: React.CSSProperties;
}) {
  React.useEffect(() => {
    try {
      window.adsbygoogle = window.adsbygoogle || [];
      window.adsbygoogle.push({});
    } catch {
      // ignore (adblock / SSR / etc.)
    }
  }, [slot]);

  const client = process.env.NEXT_PUBLIC_ADSENSE_CLIENT;

  if (!client) {
    // dev fallback (keine Ads)
    return (
      <div className={`rounded-2xl border bg-slate-50 p-4 text-sm text-slate-600 ${className}`} style={style}>
        AdSense disabled (missing <span className="font-mono">NEXT_PUBLIC_ADSENSE_CLIENT</span>).
      </div>
    );
  }

  return (
    <ins
      className={`adsbygoogle block ${className}`}
      style={style ?? { display: "block" }}
      data-ad-client={client}
      data-ad-slot={slot}
      data-ad-format={format}
      data-full-width-responsive={responsive ? "true" : "false"}
    />
  );
}