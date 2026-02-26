// src/components/AdSenseSlot.tsx
"use client";

import React from "react";

declare global {
  interface Window {
    adsbygoogle?: unknown[];
  }
}

const ADSENSE_CLIENT = "ca-pub-4388511727175069";

export function AdSenseSlot({
  slot,
  className,
  format = "auto",
  fullWidthResponsive = true,
  style,
}: {
  slot: string;
  className?: string;
  format?: string;
  fullWidthResponsive?: boolean;
  style?: React.CSSProperties;
}) {
  const insRef = React.useRef<HTMLModElement | null>(null);

  React.useEffect(() => {
    // Try to request an ad render. This can fail silently (adblock, not approved yet, etc.)
    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({});
    } catch {
      // ignore
    }
  }, [slot]);

  return (
    <ins
      ref={insRef as any}
      className={`adsbygoogle block ${className ?? ""}`}
      style={{ display: "block", ...style }}
      data-ad-client={ADSENSE_CLIENT}
      data-ad-slot={slot}
      data-ad-format={format}
      data-full-width-responsive={fullWidthResponsive ? "true" : "false"}
    />
  );
}