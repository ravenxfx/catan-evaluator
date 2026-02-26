// src/app/evaluate/page.tsx
"use client";

import React from "react";
import BoardEditor from "@/components/BoardEditor";
import { makeDefaultTiles } from "@/lib/catan/scoring";
import type { Tile } from "@/lib/catan/types";

export default function EvaluatePage() {
  const [tiles, setTiles] = React.useState<Tile[]>(() => makeDefaultTiles());

  return (
    <main className="min-h-[100dvh]">
      <div className="mx-auto w-full max-w-7xl px-3 sm:px-4 py-4 sm:py-6">
        <BoardEditor tiles={tiles} onChange={setTiles} mode="builder" />
      </div>
    </main>
  );
}