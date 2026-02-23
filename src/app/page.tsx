"use client";

import React from "react";
import BoardEditor from "@/components/BoardEditor";

export default function Page() {
  return (
    <main className="min-h-screen bg-slate-50">
      <div className="mx-auto w-full max-w-6xl px-3 py-3 sm:px-4 sm:py-4">
        {/* top bar */}
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="text-lg sm:text-xl font-semibold tracking-tight truncate">Catan Evaluator</div>
            <div className="text-xs sm:text-sm text-slate-500 truncate">
              Board bauen → Zahlen setzen → Balance & Startspots
            </div>
          </div>

          {/* optional: later add login/premium badge here */}
          <div className="flex items-center gap-2 shrink-0">
            <a
              className="rounded-xl border bg-white px-3 py-2 text-sm shadow-sm hover:shadow-md transition"
              href="https://github.com/ravenxfx/catan-evaluator"
              target="_blank"
              rel="noreferrer"
            >
              GitHub
            </a>
          </div>
        </div>

        {/* content */}
        <div className="mt-3 grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-3">
          {/* left: main editor */}
          <div className="rounded-3xl border bg-white shadow-sm p-2 sm:p-3">
            <BoardEditor />
          </div>

          {/* right: side panels (placeholder) */}
          <aside className="space-y-3">
            <div className="rounded-3xl border bg-white shadow-sm p-3">
              <div className="text-sm font-semibold">Tipps</div>
              <ul className="mt-2 text-sm text-slate-600 space-y-1 list-disc pl-5">
                <li>Tippe ein Feld an → Zahl auswählen</li>
                <li>Rohstoff ziehen → aufs Feld drop</li>
                <li>Feld-Rohstoff ziehen → auf anderes Feld (Swap)</li>
                <li>Feld-Rohstoff ziehen → „Zurücklegen“</li>
              </ul>
            </div>

            <div className="rounded-3xl border bg-white shadow-sm p-3">
              <div className="text-sm font-semibold">Nächster Schritt</div>
              <div className="mt-2 text-sm text-slate-600">
                Als nächstes speichern & ranken wir Boards mit <span className="font-semibold">Supabase</span>.
              </div>
            </div>
          </aside>
        </div>

        <div className="mt-4 text-xs text-slate-400">
          Made for desktop + mobile · Drag & Drop optimized · Next.js
        </div>
      </div>
    </main>
  );
}