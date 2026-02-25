"use client";

import React from "react";

export function AdGate({
  seconds = 5,
  title = "Sponsored",
  description = "Ad is playing…",
  onDone,
}: {
  seconds?: number;
  title?: string;
  description?: string;
  onDone: () => void;
}) {
  const [open, setOpen] = React.useState(false);
  const [left, setLeft] = React.useState(seconds);

  const start = React.useCallback(() => {
    setLeft(seconds);
    setOpen(true);
  }, [seconds]);

  React.useEffect(() => {
    if (!open) return;
    const t = window.setInterval(() => {
      setLeft((v) => v - 1);
    }, 1000);
    return () => window.clearInterval(t);
  }, [open]);

  React.useEffect(() => {
    if (!open) return;
    if (left <= 0) {
      setOpen(false);
      onDone();
    }
  }, [left, open, onDone]);

  React.useEffect(() => {
    const handler = () => start();
    window.addEventListener("adgate:start", handler as any);
    return () => window.removeEventListener("adgate:start", handler as any);
  }, [start]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-sm rounded-3xl bg-white shadow-xl border p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-sm font-semibold text-slate-900">
              {title}
            </div>
            <div className="text-xs text-slate-600 mt-0.5">
              {description}
            </div>
          </div>
          <div className="rounded-xl bg-slate-100 px-3 py-1 text-sm font-semibold text-slate-900">
            {Math.max(0, left)}s
          </div>
        </div>

        <div className="mt-4 rounded-2xl bg-slate-50 border p-3">
          <div className="h-28 rounded-xl bg-gradient-to-br from-slate-200 to-slate-100 flex items-center justify-center text-slate-600 text-sm">
            Ad placeholder
          </div>
        </div>
      </div>
    </div>
  );
}