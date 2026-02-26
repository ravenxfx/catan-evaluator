"use client";

import React from "react";
import BoardEditor from "@/components/BoardEditor";
import type { Tile, PlayerCount } from "@/lib/catan/types";
import { randomizeBoard, balanceScore } from "@/lib/catan/scoring";

const PREMIUM_THRESHOLD = 90;

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

export default function RandomPage() {
  const [tiles, setTiles] = React.useState<Tile[]>(() => makeDefaultTiles());

  const [playerCount, setPlayerCount] = React.useState<PlayerCount>(4);
  const [premium, setPremium] = React.useState(true);

  const [finding, setFinding] = React.useState(false);
  const [toast, setToast] = React.useState<string | null>(null);
  const toastTimer = React.useRef<number | null>(null);

  function showToast(msg: string) {
    setToast(msg);
    if (toastTimer.current) window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(null), 2200);
  }

  function randomize() {
    setTiles((t) => randomizeBoard(t));
    showToast("Randomized 🎲");
  }

  function reset() {
    setTiles(makeDefaultTiles());
    showToast("Reset ✅");
  }

  async function premiumSearch90(maxTries = 2000) {
    if (!premium) {
      showToast("Premium is off.");
      return;
    }
    setFinding(true);
    try {
      let bestTiles = tiles;
      let best = -Infinity;

      for (let i = 0; i < maxTries; i++) {
        const cand = randomizeBoard(bestTiles);
        const s = balanceScore(cand).score;

        if (s > best) {
          best = s;
          bestTiles = cand;
        }
        if (s >= PREMIUM_THRESHOLD) {
          setTiles(cand);
          showToast(`✅ Found ≥${PREMIUM_THRESHOLD} (try ${i + 1})`);
          return;
        }

        if (i > 0 && i % 150 === 0) await new Promise((r) => setTimeout(r, 0));
      }

      setTiles(bestTiles);
      showToast(`No ≥${PREMIUM_THRESHOLD} in ${maxTries} tries. Best: ${best}/100`);
    } finally {
      setFinding(false);
    }
  }

  return (
    <main className="min-h-[100dvh] bg-slate-50">
      <div className="mx-auto w-full max-w-7xl px-2 sm:px-4 py-2 sm:py-4">
        {/* Header: tighter on mobile */}
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0">
            <h1 className="text-lg sm:text-2xl font-semibold tracking-tight text-slate-900">Find Boards</h1>
            <p className="text-xs sm:text-sm text-slate-600">
              Randomize boards and (Premium) reveal best start spots on the map.
            </p>
          </div>

          {/* Main CTA group */}
          <div className="flex items-center gap-2">
            <button
              onClick={randomize}
              className="rounded-2xl px-4 py-3 sm:px-6 sm:py-3 text-sm sm:text-base font-extrabold text-white shadow-lg transition
                         bg-gradient-to-br from-black to-slate-800 hover:opacity-95 active:scale-[0.99]"
              type="button"
            >
              🎲 Randomize
            </button>

            <button
              onClick={reset}
              className="rounded-2xl border bg-white px-3 py-3 text-sm shadow-sm hover:shadow-md transition"
              type="button"
            >
              Reset
            </button>
          </div>
        </div>

        {/* Toast */}
        {toast ? (
          <div className="mt-2 rounded-2xl border bg-white shadow-sm px-3 py-2 text-sm">{toast}</div>
        ) : null}

        {/* Premium actions: compact, mobile-first */}
        <div className="mt-2 rounded-3xl border bg-white shadow-sm p-3">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-center gap-2">
              <div className="text-sm font-semibold">Premium</div>
              <button
                type="button"
                className={`rounded-xl border px-3 py-2 text-sm shadow-sm transition ${
                  premium ? "bg-black text-white border-black" : "bg-white hover:shadow-md"
                }`}
                onClick={() => setPremium((p) => !p)}
              >
                {premium ? "On" : "Off"}
              </button>
              <div className="text-xs text-slate-500">{premium ? "Markers ON" : "Markers hidden"}</div>
            </div>

            <button
              type="button"
              disabled={!premium || finding}
              onClick={() => premiumSearch90(2000)}
              className={`rounded-2xl px-4 py-2.5 text-sm font-semibold shadow-sm transition border ${
                !premium
                  ? "bg-slate-100 text-slate-400"
                  : finding
                  ? "bg-slate-100 text-slate-500"
                  : "bg-black text-white border-black hover:opacity-95"
              }`}
            >
              {finding ? "Searching…" : "Premium Search (≥ 90)"}
            </button>
          </div>
        </div>

        {/* Board: less whitespace, bigger feel */}
        <div className="mt-2">
          <BoardEditor
            tiles={tiles}
            onChange={setTiles}
            mode="find"
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