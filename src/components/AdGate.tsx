"use client";

import React from "react";
import { AdSenseSlot } from "@/components/AdSenseSlot";

export function AdGate({
  seconds = 3,
  title = "Sponsored",
  subtitle = "Loading…",
  slot,
  onDone,
}: {
  seconds?: number;
  title?: string;
  subtitle?: string;
  slot: string; // AdSense slot id
  onDone: () => void;
}) {
  const [left, setLeft] = React.useState(seconds);

  React.useEffect(() => {
    setLeft(seconds);
    const t = window.setInterval(() => setLeft((v) => v - 1), 1000);
    return () => window.clearInterval(t);
  }, [seconds]);

  React.useEffect(() => {
    if (left <= 0) onDone();
  }, [left, onDone]);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4">
      <div className="w-full max-w-sm rounded-3xl bg-white p-5 shadow-xl">
        <div className="text-lg font-semibold">{title}</div>
        <div className="mt-1 text-sm text-slate-600">{subtitle}</div>

        <div className="mt-4 rounded-2xl border bg-white p-3">
          <div className="text-xs text-slate-500 mb-2">Advertisement</div>
          <AdSenseSlot slot={slot} className="min-h-[120px]" />
        </div>

        <div className="mt-4 rounded-2xl border bg-slate-50 p-4">
          <div className="text-sm text-slate-600">Continuing in</div>
          <div className="mt-1 text-4xl font-extrabold tabular-nums">{Math.max(0, left)}s</div>

          <button
            type="button"
            onClick={onDone}
            className="mt-4 w-full rounded-2xl bg-black text-white py-3 font-semibold hover:opacity-95"
          >
            Continue
          </button>

          <div className="mt-2 text-[11px] text-slate-500">
            If ads are blocked, the countdown still continues.
          </div>
        </div>
      </div>
    </div>
  );
}