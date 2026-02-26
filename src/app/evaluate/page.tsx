"use client";

import React from "react";
import BoardEditor from "@/components/BoardEditor";
import type { Tile } from "@/lib/catan/types";
import { makeDefaultTiles } from "@/lib/catan/scoring";

export default function EvaluatePage() {
  const [tiles, setTiles] = React.useState<Tile[]>(() => makeDefaultTiles());

  return (
    <main className="min-h-[100dvh] bg-slate-50">
      <div className="mx-auto w-full max-w-7xl px-3 sm:px-4 py-3 sm:py-5">
        <div className="mb-3">
          <h1 className="text-lg sm:text-2xl font-semibold tracking-tight text-slate-900">Catan Board Evaluator</h1>
          <p className="text-xs sm:text-sm text-slate-600">
            Paint resources • Pick numbers • Check balance • Show best starting markers
          </p>
        </div>

        <BoardEditor tiles={tiles} onChange={setTiles} mode="builder" />
      </div>
    </main>
  );
}