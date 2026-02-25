"use client";

import Link from "next/link";

export default function Page() {
  return (
    <main className="min-h-[100dvh] bg-slate-50">
      <div className="mx-auto w-full max-w-6xl px-4 py-8">
        <div className="flex flex-col gap-2">
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-slate-900">Catan Evaluator</h1>
          <p className="text-sm text-slate-600">
            Two modes: generate great boards, or evaluate your own board.
          </p>
        </div>

        <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Link
            href="/random"
            className="rounded-3xl border bg-white shadow-sm p-5 hover:shadow-md transition"
          >
            <div className="text-sm font-semibold text-slate-900">🎲 Find Boards</div>
            <div className="mt-1 text-sm text-slate-600">
              Use the randomizer to discover boards, see their Balance score and best start spots.
            </div>
            <div className="mt-4 inline-flex rounded-xl bg-black text-white px-3 py-2 text-sm font-semibold">
              Open Randomizer
            </div>
          </Link>

          <Link
            href="/evaluate"
            className="rounded-3xl border bg-white shadow-sm p-5 hover:shadow-md transition"
          >
            <div className="text-sm font-semibold text-slate-900">🧩 Evaluate Your Board</div>
            <div className="mt-1 text-sm text-slate-600">
              Paint resources & pick numbers, then check Balance and best start spots.
            </div>
            <div className="mt-4 inline-flex rounded-xl bg-black text-white px-3 py-2 text-sm font-semibold">
              Open Editor
            </div>
          </Link>
        </div>
      </div>
    </main>
  );
}