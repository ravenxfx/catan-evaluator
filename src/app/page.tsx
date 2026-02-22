"use client";

import React from "react";
import dynamic from "next/dynamic";
import { makeInitialState, type Resource, type BoardState } from "@/lib/boardState";
import { validateCompleteBoard } from "@/lib/catan/balance";
import type { Tile } from "@/lib/catan/score";
import { pipValue } from "@/lib/catan/score";
import type { StartMarker } from "@/components/DndBoard";

const DndBoard = dynamic(() => import("@/components/DndBoard"), { ssr: false });

function shuffle<T>(arr: T[]) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const RES_BAG: Resource[] = [
  ...Array(4).fill("holz"),
  ...Array(4).fill("schaf"),
  ...Array(4).fill("getreide"),
  ...Array(3).fill("lehm"),
  ...Array(3).fill("stein"),
  ...Array(1).fill("wueste"),
];

const NUM_BAG: number[] = [
  2,
  12,
  ...Array(2).fill(3),
  ...Array(2).fill(4),
  ...Array(2).fill(5),
  ...Array(2).fill(6),
  ...Array(2).fill(8),
  ...Array(2).fill(9),
  ...Array(2).fill(10),
  ...Array(2).fill(11),
];

function makeRandomBoardState(): BoardState {
  const base = makeInitialState();
  const resBag = shuffle(RES_BAG);
  const numBag = shuffle(NUM_BAG);
  let numIdx = 0;

  const tiles = base.tiles.map((t, i) => {
    const res = resBag[i] ?? null;
    const num = res === "wueste" ? null : (numBag[numIdx++] ?? null);
    return { ...t, res, num };
  });

  return {
    tiles,
    resourcePool: { holz: 0, lehm: 0, schaf: 0, getreide: 0, stein: 0, wueste: 0 },
    numberPool: { 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 8: 0, 9: 0, 10: 0, 11: 0, 12: 0 },
  };
}

function Pill({ children, tone }: { children: React.ReactNode; tone?: "good" | "warn" | "info" }) {
  const cls =
    tone === "good"
      ? "bg-green-50 text-green-800 border-green-200"
      : tone === "warn"
      ? "bg-amber-50 text-amber-900 border-amber-200"
      : "bg-slate-50 text-slate-800 border-slate-200";
  return <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs ${cls}`}>{children}</span>;
}

function ProgressBar({ value }: { value: number }) {
  const v = Math.max(0, Math.min(100, value));
  return (
    <div className="h-2 w-full rounded-full bg-white/50 overflow-hidden">
      <div className="h-full rounded-full bg-black" style={{ width: `${v}%` }} />
    </div>
  );
}

function cardStyleByScore(score: number) {
  if (score >= 80) return "border-green-200 bg-green-50";
  if (score >= 60) return "border-sky-200 bg-sky-50";
  return "border-amber-200 bg-amber-50";
}

function ScoreCard({ title, score, subtitle }: { title: string; score: number; subtitle: string }) {
  return (
    <div className={`rounded-2xl border p-5 shadow-sm space-y-3 ${cardStyleByScore(score)}`}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-sm text-slate-600">{subtitle}</div>
          <div className="text-xl font-semibold">{title}</div>
        </div>
        <div className="text-right">
          <div className="text-3xl font-semibold tabular-nums">{score}</div>
          <div className="text-xs text-slate-600">/ 100</div>
        </div>
      </div>
      <ProgressBar value={score} />
    </div>
  );
}

/** ----------------- Startspot Engine (vertex-based) ----------------- */

function axialToPixel(q: number, r: number, size: number) {
  const x = size * Math.sqrt(3) * (q + r / 2);
  const y = size * (3 / 2) * r;
  return { x, y };
}

function cornerPoints(q: number, r: number, size: number) {
  const c = axialToPixel(q, r, size);
  const pts: { x: number; y: number }[] = [];
  for (let i = 0; i < 6; i++) {
    const angle = (Math.PI / 180) * (60 * i - 30);
    pts.push({ x: c.x + size * Math.cos(angle), y: c.y + size * Math.sin(angle) });
  }
  return pts;
}

type Vertex = {
  key: string;
  x: number; // board local pixel
  y: number;
  tiles: Tile[];
  score: number;
};

function scoreVertex(adj: Tile[]) {
  // productive tiles = non-desert with a number
  const productive = adj.filter((t) => t.res && t.res !== "wueste" && t.num !== null);
  const sum = productive.reduce((acc, t) => acc + pipValue(t.num), 0);

  // diversity bonus
  const uniq = new Set(productive.map((t) => t.res));
  const diversityBonus = uniq.size === 3 ? 3 : uniq.size === 2 ? 1 : 0;

  // desert/outside are equivalent: missing productive slots
  const missing = 3 - productive.length;
  const missingPenalty = missing * 3; // tune: 2..4

  // small penalty if same resource twice
  const dupPenalty = productive.length - uniq.size; // 0 or 1
  const penalty = dupPenalty * 1;

  return Math.max(0, Math.round(sum + diversityBonus - penalty - missingPenalty));
}

function computeVertices(tiles: Tile[], size: number) {
  const eps = 10;
  const keyFor = (x: number, y: number) => `${Math.round(x / eps)},${Math.round(y / eps)}`;

  const map = new Map<string, { xSum: number; ySum: number; n: number; tiles: Tile[] }>();

  for (const t of tiles) {
    const corners = cornerPoints(t.q, t.r, size);
    for (const p of corners) {
      const k = keyFor(p.x, p.y);
      const cur = map.get(k);
      if (!cur) {
        map.set(k, { xSum: p.x, ySum: p.y, n: 1, tiles: [t] });
      } else {
        if (!cur.tiles.some((x) => x.q === t.q && x.r === t.r)) cur.tiles.push(t);
        cur.xSum += p.x;
        cur.ySum += p.y;
        cur.n += 1;
      }
    }
  }

  const vertices: Vertex[] = [];
  for (const [k, v] of map.entries()) {
    const vx = v.xSum / v.n;
    const vy = v.ySum / v.n;

    // valid intersections are usually 2 or 3 tiles, not 1
    if (v.tiles.length < 2 || v.tiles.length > 3) continue;

    const score = scoreVertex(v.tiles);
    vertices.push({ key: k, x: vx, y: vy, tiles: v.tiles, score });
  }

  vertices.sort((a, b) => b.score - a.score);
  return vertices;
}

// simple "no adjacent settlements" constraint via min distance
function selectBestLegalSet(vertices: Vertex[], count: number, size: number) {
  const minDist = size * 1.05;

  const chosen: Vertex[] = [];
  for (const v of vertices) {
    if (chosen.length >= count) break;

    const ok = chosen.every((c) => {
      const dx = c.x - v.x;
      const dy = c.y - v.y;
      return Math.sqrt(dx * dx + dy * dy) >= minDist;
    });

    if (ok) chosen.push(v);
  }
  return chosen;
}

function balanceScoreFromSet(set: Vertex[]) {
  if (set.length === 0) return 0;
  const scores = set.map((s) => s.score);
  const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
  const variance = scores.reduce((a, b) => a + (b - avg) ** 2, 0) / scores.length;
  const stdev = Math.sqrt(variance);

  const min = 0.8;
  const max = 4.5;
  const t = (stdev - min) / (max - min);
  return Math.round(100 * (1 - Math.max(0, Math.min(1, t))));
}

// resource metrics
function resourcePipTotals(tiles: Tile[]) {
  const totals: Record<Resource, number> = { holz: 0, lehm: 0, schaf: 0, getreide: 0, stein: 0, wueste: 0 };

  for (const t of tiles) {
    const res = (t.res as Resource) ?? null;
    if (!res) continue;
    if (res === "wueste") continue;
    totals[res] += pipValue(t.num);
  }
  return totals;
}

function resourceBalanceScore(tiles: Tile[]) {
  const totals = resourcePipTotals(tiles);
  const vals = (["holz", "lehm", "schaf", "getreide", "stein"] as Resource[]).map((r) => totals[r]);
  const avg = vals.reduce((a, b) => a + b, 0) / vals.length;
  const variance = vals.reduce((a, b) => a + (b - avg) ** 2, 0) / vals.length;
  const stdev = Math.sqrt(variance);

  // stdev 0 => 100, stdev 6+ => ~0
  const max = 6;
  const t = Math.max(0, Math.min(1, stdev / max));
  return Math.round(100 * (1 - t));
}

export default function Page() {
  const [state, setState] = React.useState(makeInitialState());
  const [players, setPlayers] = React.useState<3 | 4>(4);
  const [premiumEnabled, setPremiumEnabled] = React.useState(true);

  const topN = players === 3 ? 6 : 8;

  const tilesForEngine = React.useMemo<Tile[]>(
    () => state.tiles.map((t) => ({ q: t.q, r: t.r, res: t.res ?? "", num: t.num })),
    [state.tiles]
  );

  const view = React.useMemo(() => {
    const val = validateCompleteBoard(tilesForEngine);
    if (!val.ok) return { ok: false as const, errors: val.errors };

    const size = 58;

    const vertices = computeVertices(tilesForEngine, size);
    const legal = selectBestLegalSet(vertices, topN, size);

    const balance = balanceScoreFromSet(legal);
    const resBal = resourceBalanceScore(tilesForEngine);
    const totals = resourcePipTotals(tilesForEngine);

    const markers: StartMarker[] = legal.map((v, idx) => ({
      id: v.key,
      rank: idx + 1,
      score: v.score,
      x: v.x,
      y: v.y,
    }));

    return { ok: true as const, markers, legal, balance, resBal, totals };
  }, [tilesForEngine, players]);

  const resMax = view.ok
    ? Math.max(view.totals.holz, view.totals.lehm, view.totals.schaf, view.totals.getreide, view.totals.stein, 1)
    : 1;

  return (
    <main className="mx-auto max-w-7xl p-6 space-y-5">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Catan Board Evaluator</h1>
          <div className="text-sm text-slate-500">Rohstoffe draggen · Zahlen per Popover auf dem Feld wählen · rechts: Scores & Top-Spots</div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex rounded-xl border overflow-hidden bg-white shadow-sm">
            <button className={`px-3 py-2 text-sm ${players === 3 ? "bg-black text-white" : "bg-white"}`} onClick={() => setPlayers(3)} type="button">
              3 Spieler
            </button>
            <button className={`px-3 py-2 text-sm ${players === 4 ? "bg-black text-white" : "bg-white"}`} onClick={() => setPlayers(4)} type="button">
              4 Spieler
            </button>
          </div>

          <button className="px-3 py-2 rounded-xl border bg-white shadow-sm" onClick={() => setState(makeRandomBoardState())} type="button">
            Randomize
          </button>

          <button className="px-3 py-2 rounded-xl border bg-white shadow-sm" onClick={() => setState(makeInitialState())} type="button">
            Reset
          </button>

          <button
            className={`px-3 py-2 rounded-xl border shadow-sm ${premiumEnabled ? "bg-black text-white" : "bg-white"}`}
            onClick={() => setPremiumEnabled((p) => !p)}
            type="button"
          >
            {premiumEnabled ? "Premium: AN" : "Premium: AUS"}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        <div className="lg:col-span-8">
          <div className="rounded-2xl border bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <div>
                <div className="font-semibold">Board</div>
                <div className="text-xs text-slate-500">Klick auf Hex → Zahl wählen · Marker = Top-Spots (Premium)</div>
              </div>
              {view.ok ? <Pill tone="info">bereit</Pill> : <Pill tone="warn">unvollständig</Pill>}
            </div>

            <DndBoard state={state} setState={setState} startMarkers={view.ok ? view.markers : []} showMarkers={premiumEnabled && view.ok} />
          </div>
        </div>

        <div className="lg:col-span-4 space-y-4">
          {!view.ok ? (
            <div className="rounded-2xl border bg-white p-5 shadow-sm">
              <div className="text-lg font-semibold">Auswertung</div>
              <div className="mt-2 text-amber-900">Board noch nicht vollständig / korrekt:</div>
              <ul className="mt-2 list-disc pl-6 text-sm text-slate-700 space-y-1">
                {view.errors.map((e, i) => (
                  <li key={i}>{e}</li>
                ))}
              </ul>
              <div className="mt-3 text-xs text-slate-500">Tipp: Randomize erzeugt ein gültiges Board.</div>
            </div>
          ) : (
            <>
              <ScoreCard title="Balance Score" score={view.balance} subtitle={`Startspots: Streuung im legalen Set (${players} Spieler)`} />
              <ScoreCard title="Resource Balance" score={view.resBal} subtitle="Wie gleichmäßig Pip-Power über Ressourcen verteilt ist" />

              {/* Resource Strength bars */}
              <div className="rounded-2xl border bg-white p-5 shadow-sm">
                <div className="text-lg font-semibold">Resource Strength</div>
                <div className="text-sm text-slate-500">Pip-Power pro Rohstoff</div>

                <div className="mt-4 space-y-3">
                  {(["holz", "lehm", "schaf", "getreide", "stein"] as const).map((r) => {
                    const v = view.totals[r];
                    const pct = Math.round((v / resMax) * 100);
                    return (
                      <div key={r}>
                        <div className="flex items-center justify-between text-sm">
                          <span className="capitalize">{r}</span>
                          <span className="font-mono">{v}</span>
                        </div>
                        <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                          <div className="h-full bg-black" style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Top spots */}
              <div className="rounded-2xl border bg-white p-5 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-lg font-semibold">Top Startspots</div>
                    <div className="text-sm text-slate-500">Kompakt: Rang & Score</div>
                  </div>
                  {premiumEnabled ? <Pill tone="good">Premium</Pill> : <Pill tone="warn">Paywall</Pill>}
                </div>

                {!premiumEnabled ? (
                  <div className="mt-4 rounded-xl border bg-slate-50 p-4">
                    <div className="text-sm font-semibold">Gesperrt</div>
                    <div className="text-sm text-slate-600 mt-1">Später: Login/Stripe. Für jetzt Premium anschalten.</div>
                  </div>
                ) : (
                  <ol className="mt-4 space-y-2">
                    {view.legal.map((v, idx) => (
                      <li key={v.key} className="flex items-center justify-between rounded-xl border px-3 py-2">
                        <div className="flex items-center gap-3">
                          <span className="h-7 w-7 rounded-full bg-black text-white flex items-center justify-center text-sm font-semibold">{idx + 1}</span>
                        </div>
                        <div className="font-mono text-lg tabular-nums">{v.score}</div>
                      </li>
                    ))}
                  </ol>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </main>
  );
}