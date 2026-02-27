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
      if (Math.max(Math.abs(q), Math.abs(r), Math.abs(s)) <= R) {
        tiles.push({ q, r, res: null, num: null });
      }
    }
  }
  tiles.sort((a, b) => (a.r !== b.r ? a.r - b.r : a.q - b.q));
  return tiles;
}

export default function EvaluatePage() {
  const [tiles, setTiles] = React.useState<Tile[]>(() => makeDefaultTiles());
  const [playerCount, setPlayerCount] = React.useState<PlayerCount>(4);

  return (
    <main className="min-h-[100dvh] bg-slate-50">
      <div className="mx-auto w-full max-w-7xl px-3 sm:px-4 py-4 sm:py-6">
        <BoardEditor
          tiles={tiles}
          onChange={setTiles}
          mode="builder"
          playerCount={playerCount}
          onPlayerCountChange={setPlayerCount}
        />
      </div>
    </main>
  );
}