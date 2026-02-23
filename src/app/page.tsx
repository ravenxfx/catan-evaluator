"use client";

import React from "react";
import BoardEditor, { Tile } from "@/components/BoardEditor";

function createDefaultTiles(): Tile[] {
  // Standard Catan board: hex radius 2 => 19 tiles
  const tiles: Tile[] = [];
  const R = 2;

  for (let q = -R; q <= R; q++) {
    for (let r = -R; r <= R; r++) {
      const s = -q - r;
      if (Math.max(Math.abs(q), Math.abs(r), Math.abs(s)) <= R) {
        tiles.push({
          q,
          r,
          res: "", // ✅ BoardEditor erwartet string (nicht null)
          num: null,
        });
      }
    }
  }

  // Stable order: rows top->bottom, within row left->right
  tiles.sort((a, b) => (a.r !== b.r ? a.r - b.r : a.q - b.q));
  return tiles;
}

export default function Page() {
  const [tiles, setTiles] = React.useState<Tile[]>(() => createDefaultTiles());

  // optional persistence
  React.useEffect(() => {
    try {
      const raw = localStorage.getItem("catan_tiles_v1");
      if (!raw) return;
      const parsed = JSON.parse(raw) as Tile[];
      if (Array.isArray(parsed) && parsed.length === 19) setTiles(parsed);
    } catch {}
  }, []);

  React.useEffect(() => {
    try {
      localStorage.setItem("catan_tiles_v1", JSON.stringify(tiles));
    } catch {}
  }, [tiles]);

  return (
    <main className="min-h-screen bg-slate-50">
      <div className="mx-auto w-full max-w-6xl px-3 py-3 sm:px-4 sm:py-4">
        {/* Topbar */}
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="text-lg sm:text-xl font-semibold tracking-tight truncate">
              Catan Evaluator
            </div>
            <div className="text-xs sm:text-sm text-slate-500 truncate">
              Board bauen → Zahlen wählen → Balance & Startspots
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              className="rounded-xl border bg-white px-3 py-2 text-sm shadow-sm hover:shadow-md transition"
              onClick={() => {
                setTiles(createDefaultTiles());
                try {
                  localStorage.removeItem("catan_tiles_v1");
                } catch {}
              }}
              title="Board zurücksetzen"
            >
              Reset
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="mt-3 grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-3">
          <div className="rounded-3xl border bg-white shadow-sm p-2 sm:p-3">
            <BoardEditor tiles={tiles} onChange={setTiles} />
          </div>

          <aside className="space-y-3">
            <div className="rounded-3xl border bg-white shadow-sm p-3">
              <div className="text-sm font-semibold">Bedienung</div>
              <ul className="mt-2 text-sm text-slate-600 space-y-1 list-disc pl-5">
                <li>Rohstoff oben ziehen → aufs Feld droppen</li>
                <li>Feld antippen → Zahl auswählen</li>
                <li>Rohstoff vom Feld ziehen → anderes Feld (Swap)</li>
                <li>Rohstoff vom Feld → „Zurücklegen“</li>
              </ul>
            </div>

            <div className="rounded-3xl border bg-white shadow-sm p-3">
              <div className="text-sm font-semibold">Nächster Schritt</div>
              <div className="mt-2 text-sm text-slate-600">
                Supabase: Boards speichern & öffentlich ranken.
              </div>
            </div>
          </aside>
        </div>

        <div className="mt-4 text-xs text-slate-400">
          Mobile-first · Drag & Drop smooth · Next.js on Vercel
        </div>
      </div>
    </main>
  );
}