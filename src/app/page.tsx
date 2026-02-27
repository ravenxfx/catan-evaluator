"use client";

import React from "react";

export default function HomePage() {
  const chips = [
    "Catan board generator",
    "Balanced Catan board",
    "Fair Catan setup",
    "Catan randomizer",
    "Best starting positions",
    "Settlers of Catan map",
    "Catan pips",
    "Generador de tablero Catan",
    "Générateur plateau Catan",
    "Generatore tabellone Catan",
    "Катaн поле генератор",
  ];

  return (
    <main className="min-h-dvh bg-slate-50">
      <div className="mx-auto w-full max-w-5xl px-4 py-6">
        <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-950">
          Catan Boards
        </h1>

        <p className="mt-2 text-base sm:text-lg text-slate-800">
          Generate fairer Settlers of Catan boards, check balance, and reveal best starting positions.
          Use <span className="font-semibold">AI Super Search</span> to find more even setups for your game night.
        </p>

        <div className="mt-5 grid grid-cols-1 gap-3">
          <a
            href="/random"
            className="rounded-3xl bg-slate-900 text-white px-5 py-4 text-lg font-semibold shadow-sm hover:shadow-md transition"
          >
            🎲 Find Boards (Generator)
          </a>

          <a
            href="/evaluate"
            className="rounded-3xl border bg-white text-slate-950 px-5 py-4 text-lg font-semibold shadow-sm hover:shadow-md transition"
          >
            🧩 Evaluate Board (Builder)
          </a>
        </div>

        <div className="mt-8 rounded-3xl border bg-white p-4 shadow-sm">
          <div className="text-sm font-semibold text-slate-900">Popular searches</div>
          <div className="mt-3 flex flex-wrap gap-2">
            {chips.map((c) => (
              <span
                key={c}
                className="rounded-full border bg-slate-50 px-3 py-1.5 text-sm font-semibold text-slate-800"
              >
                {c}
              </span>
            ))}
          </div>

          <p className="mt-4 text-sm text-slate-700">
            Tip: In the generator, press <span className="font-semibold">AI Super Search</span> to discover more balanced boards
            and then reveal the <span className="font-semibold">best starting positions</span> on the map.
          </p>
        </div>
      </div>
    </main>
  );
}