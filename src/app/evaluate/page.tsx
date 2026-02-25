"use client";

import React from "react";
import BoardEditor from "@/components/BoardEditor";
import type { Tile, PlayerCount } from "@/lib/catan/types";

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

export default function EvaluatePage() {
  const [tiles, setTiles] = React.useState<Tile[]>(() => makeDefaultTiles());
  const [playerCount, setPlayerCount] = React.useState<PlayerCount>(4);
  const [premium, setPremium] = React.useState(true);

  return (
    <main className="min-h-[100dvh] bg-slate-50">
      <div className="mx-auto w-full max-w-7xl px-3 sm:px-4 py-3 sm:py-5">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-lg sm:text-2xl font-semibold tracking-tight text-slate-900">Evaluate Your Board</h1>
            <p className="text-xs sm:text-sm text-slate-600">
              Paint resources, choose numbers, then check Balance + start positions.
            </p>
          </div>
        </div>

        <div className="mt-3">
          <BoardEditor
            tiles={tiles}
            onChange={setTiles}
            mode="builder"
            playerCount={playerCount}
            onPlayerCountChange={setPlayerCount}
            premium={premium}
            onPremiumChange={setPremium}
            showStartSpotList={false}
          />
        </div>
      </div>
    </main>
  );
}