import type { PlayerCount, Resource, Tile } from "./types";
import { NUMBER_COUNTS, RESOURCE_COUNTS } from "./types";
import { pipValue } from "./pips";

/**
 * Default empty board (radius 2 => 19 tiles)
 */
export function makeDefaultTiles(): Tile[] {
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

/**
 * Resource Strength = sum of pipValue across all tiles of that resource.
 */
export function resourceStrength(tiles: Tile[]): Record<Resource, number> {
  const out: Record<Resource, number> = {
    holz: 0,
    lehm: 0,
    schaf: 0,
    getreide: 0,
    stein: 0,
    wueste: 0,
  };

  for (const t of tiles) {
    if (!t.res) continue;
    out[t.res] += pipValue(t.num);
  }
  return out;
}

/**
 * Balance Score 0..100
 * - compares how evenly expected production is distributed across resources.
 * - 100 = perfectly even, 0 = super skewed.
 */
export function balanceScore(tiles: Tile[]): { score: number; strengths: Record<Resource, number> } {
  const strengths = resourceStrength(tiles);

  // only 5 resources matter (desert excluded)
  const vals = (["holz", "lehm", "schaf", "getreide", "stein"] as Resource[]).map((r) => strengths[r]);

  const mean = vals.reduce((a, b) => a + b, 0) / vals.length;
  if (mean <= 0) return { score: 0, strengths };

  const variance = vals.reduce((acc, v) => acc + (v - mean) ** 2, 0) / vals.length;
  const stdev = Math.sqrt(variance);

  // coefficient of variation
  const cv = stdev / mean;

  // map cv -> score; cv 0 => 100; cv 0.6 => ~0 (clamp)
  const raw = 100 * (1 - Math.min(1, cv / 0.6));
  return { score: Math.max(0, Math.min(100, Math.round(raw))), strengths };
}

export type ScoredVertex = {
  id: string; // stable key
  x: number;
  y: number;
  adjacent: { res: Resource; num: number | null; tileKey: string }[];
  score: number;
};

function axialToPixel(q: number, r: number, size: number) {
  const x = size * Math.sqrt(3) * (q + r / 2);
  const y = size * (3 / 2) * r;
  return { x, y };
}

function tileKey(q: number, r: number) {
  return `${q},${r}`;
}

function hexCornerPoints(cx: number, cy: number, size: number) {
  const pts: { x: number; y: number }[] = [];
  for (let i = 0; i < 6; i++) {
    const angle = (Math.PI / 180) * (60 * i - 30);
    pts.push({ x: cx + size * Math.cos(angle), y: cy + size * Math.sin(angle) });
  }
  return pts;
}

function roundKey(x: number, y: number) {
  const rx = Math.round(x * 1000) / 1000;
  const ry = Math.round(y * 1000) / 1000;
  return `${rx},${ry}`;
}

/**
 * Score settlement vertices (hex corners).
 * Desert counts like "missing tile" (same penalty as outside).
 */
export function scoreVertices(tiles: Tile[], size = 58): ScoredVertex[] {
  const vmap = new Map<
    string,
    {
      x: number;
      y: number;
      adj: { res: Resource; num: number | null; tileKey: string }[];
    }
  >();

  for (const t of tiles) {
    if (!t.res) continue;
    const center = axialToPixel(t.q, t.r, size);
    const corners = hexCornerPoints(center.x, center.y, size);

    for (const c of corners) {
      const k = roundKey(c.x, c.y);
      const cur = vmap.get(k);
      const entry = { res: t.res, num: t.num, tileKey: tileKey(t.q, t.r) };

      if (!cur) {
        vmap.set(k, { x: c.x, y: c.y, adj: [entry] });
      } else {
        if (!cur.adj.some((a) => a.tileKey === entry.tileKey)) cur.adj.push(entry);
      }
    }
  }

  const scored: ScoredVertex[] = [];

  for (const [k, v] of vmap.entries()) {
    const resourceAdj = v.adj.filter((a) => a.res !== "wueste");
    const resourceCount = resourceAdj.length; // 0..3
    if (resourceCount === 0) continue;

    const base = resourceAdj.reduce((sum, a) => sum + pipValue(a.num), 0);

    // desert counts like outside => factor by resourceCount/3
    const factor = resourceCount / 3;

    const distinct = new Set(resourceAdj.map((a) => a.res)).size;
    const diversityBonus = distinct <= 1 ? 0 : 0.75 * (distinct - 1);

    const score = (base + diversityBonus) * factor;

    scored.push({
      id: k,
      x: v.x,
      y: v.y,
      adjacent: resourceAdj,
      score,
    });
  }

  scored.sort((a, b) => b.score - a.score);
  return scored;
}

export function bestStartSpots(tiles: Tile[], playerCount: PlayerCount) {
  const all = scoreVertices(tiles);
  const n = playerCount === 3 ? 6 : 8;
  return all.slice(0, n).map((v, idx) => ({
    ...v,
    rank: idx + 1,
    score: Math.round(v.score * 100) / 100,
  }));
}

/**
 * Randomize board respecting official counts.
 */
export function randomizeBoard(tiles: Tile[], rng = Math.random): Tile[] {
  const next = tiles.map((t) => ({ ...t }));

  const resPool: Resource[] = [];
  (Object.keys(RESOURCE_COUNTS) as Resource[]).forEach((r) => {
    for (let i = 0; i < RESOURCE_COUNTS[r]; i++) resPool.push(r);
  });
  shuffle(resPool, rng);

  for (let i = 0; i < next.length; i++) {
    next[i].res = resPool[i] ?? null;
    next[i].num = null;
  }

  const numPool: number[] = [];
  Object.entries(NUMBER_COUNTS).forEach(([k, cnt]) => {
    const n = Number(k);
    for (let i = 0; i < cnt; i++) numPool.push(n);
  });
  shuffle(numPool, rng);

  let ptr = 0;
  for (const t of next) {
    if (t.res === "wueste") t.num = null;
    else {
      t.num = numPool[ptr] ?? null;
      ptr++;
    }
  }

  return next;
}

function shuffle<T>(arr: T[], rng: () => number) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
}