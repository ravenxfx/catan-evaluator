"use client";

import React from "react";
import BoardEditor from "@/components/BoardEditor";
import type { Tile } from "@/lib/catan/types";

function makeDefaultTiles(): Tile[] {
  const tiles: Tile[] = [];
  const R = 2;
  for (let q = -R; q <= R; q++) {
    for (let r = -R; r <= R; r++) {
      const s = -q - r;
      if (Math.max(Math.abs(q), Math.abs(r), Math.abs(s)) <= R) tiles.push({ q, r, res: null, num: null });
    }
  }
  tiles.sort((a, b) => (a.r !== b.r ? a.r - b.r : a.q - b.q));
  return tiles;
}

export default function Page() {
  const [tiles, setTiles] = React.useState<Tile[]>(() => makeDefaultTiles());

  // persist board (nice for mobile)
  React.useEffect(() => {
    try {
      const raw = localStorage.getItem("catan_tiles_v2");
      if (!raw) return;
      const parsed = JSON.parse(raw) as Tile[];
      if (Array.isArray(parsed) && parsed.length === 19) setTiles(parsed);
    } catch {}
  }, []);

  React.useEffect(() => {
    try {
      localStorage.setItem("catan_tiles_v2", JSON.stringify(tiles));
    } catch {}
  }, [tiles]);

  return (
    <main className="min-h-screen bg-slate-50">
      <div className="mx-auto w-full max-w-6xl px-3 py-3 sm:px-4 sm:py-4">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="text-lg sm:text-xl font-semibold tracking-tight truncate">Catan Evaluator</div>
            <div className="text-xs sm:text-sm text-slate-500 truncate">
              Paint Brush Rohstoffe · Popover Zahlen · Balance & Startspots
            </div>
          </div>

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

        <div className="mt-3 rounded-3xl border bg-white shadow-sm p-2 sm:p-3">
          <BoardEditor tiles={tiles} onChange={setTiles} />
        </div>

        <div className="mt-4 text-xs text-slate-400">
          Mobile-first · Snatched layout · Brush editing · Next: Supabase save/ranking
        </div>
      </div>
    </main>
  );
}