import type { Tile, Resource } from "@/lib/catan/types";
import { pipValue } from "@/lib/catan/pips";

const VALID_RES: Resource[] = [
  "holz",
  "lehm",
  "schaf",
  "getreide",
  "stein",
  "wueste",
];

export function balanceScore(tiles: Tile[]) {
  const strengths: Record<Resource, number> = {
    holz: 0,
    lehm: 0,
    schaf: 0,
    getreide: 0,
    stein: 0,
    wueste: 0,
  };

  for (const t of tiles) {
    if (!t.res || t.num == null) continue;
    if (!VALID_RES.includes(t.res)) continue;

    strengths[t.res] += pipValue(t.num);
  }

  // Desert zählt NICHT in Balance
  const values = [
    strengths.holz,
    strengths.lehm,
    strengths.schaf,
    strengths.getreide,
    strengths.stein,
  ];

  const max = Math.max(...values);
  const min = Math.min(...values);

  const diff = max - min;

  // 0–100 Score
  const score = Math.max(0, 100 - diff * 5);

  return {
    score,
    strengths,
  };
}