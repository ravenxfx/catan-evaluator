"use client";

import React from "react";
import BoardEditor from "@/components/BoardEditor";
import type { Tile } from "@/lib/catan/types";
import { makeDefaultTiles } from "@/lib/catan/scoring";

export default function EvaluatePage() {
  const [tiles, setTiles] = React.useState<Tile[]>(() => makeDefaultTiles());

  return (
    <main className="min-h-dvh bg-slate-50">
      <div className="mx-auto w-full max-w-6xl px-3 py-3 sm:py-5">
        <BoardEditor tiles={tiles} onChange={setTiles} mode="builder" />
      </div>
    </main>
  );
}