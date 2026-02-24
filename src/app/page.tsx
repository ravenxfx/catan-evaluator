"use client";

import React from "react";
import BoardEditor from "@/components/BoardEditor";
import type { Tile } from "@/lib/catan/types";

function makeDefaultTiles(): Tile[] {
  // radius 2 => 19 tiles
  const tiles: Tile[] = [];
  const R = 2;
  for (let q = -R; q <= R; q++) {
    for (let r = -R; r <= R; r++) {
      const s = -q - r;
      if (Math.max(Math.abs(q), Math.abs(r), Math.abs(s)) <= R) {
        tiles.push({ q, r, res: null, num: null } as Tile);
      }
    }
  }
  tiles.sort((a, b) => (a.r !== b.r ? a.r - b.r : a.q - b.q));
  return tiles;
}

export default function Page() {
  const [tiles, setTiles] = React.useState<Tile[]>(() => makeDefaultTiles());

  return (
    <main className="min-h-[100dvh] bg-slate-50">
      <div className="mx-auto w-full max-w-7xl px-3 sm:px-4 py-3 sm:py-5">
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <h1 className="text-lg sm:text-2xl font-semibold tracking-tight text-slate-900">
              Catan Evaluator
            </h1>
            <p className="text-xs sm:text-sm text-slate-600">
              Brush Rohstoffe · Popover Zahlen · Balance · Start Spots
            </p>
          </div>
        </div>

        <div className="mt-3">
          <BoardEditor tiles={tiles} onChange={setTiles} />
        </div>
      </div>
    </main>
  );
}