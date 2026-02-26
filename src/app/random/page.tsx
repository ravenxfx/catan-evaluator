"use client";

import React from "react";
import BoardEditor from "@/components/BoardEditor";
import type { PlayerCount, Tile } from "@/lib/catan/types";
import { makeDefaultTiles } from "@/lib/catan/scoring";

export default function RandomPage() {
  const [tiles, setTiles] = React.useState<Tile[]>(() => makeDefaultTiles());
  const [playerCount, setPlayerCount] = React.useState<PlayerCount>(4);

  return (
    <main className="min-h-[100dvh] bg-slate-50">
      <div className="mx-auto w-full max-w-7xl px-3 sm:px-4 py-3 sm:py-5">
        <div className="mb-3">
          <h1 className="text-lg sm:text-2xl font-semibold tracking-tight text-slate-900">Catan Board Finder</h1>
          <p className="text-xs sm:text-sm text-slate-600">
            Randomize boards • Super Search • Show best starting positions (markers)
          </p>
        </div>

        <BoardEditor
          tiles={tiles}
          onChange={setTiles}
          mode="find"
          playerCount={playerCount}
          onPlayerCountChange={setPlayerCount}
        />
      </div>
    </main>
  );
}