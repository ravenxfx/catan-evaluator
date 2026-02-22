import type { Tile } from "@/lib/catan/score";
import type { Resource } from "@/lib/boardState";

const VALID_RES: Resource[] = ["holz", "lehm", "schaf", "getreide", "stein", "wueste"];
const VALID_NUM = new Set([2, 3, 4, 5, 6, 8, 9, 10, 11, 12]);

export function validateCompleteBoard(tiles: Tile[]) {
  const errors: string[] = [];

  // Resource counts
  const counts: Record<string, number> = {};
  for (const t of tiles) {
    const r = (t.res ?? "") as string;
    if (!r) continue;
    counts[r] = (counts[r] ?? 0) + 1;
  }

  const placedRes = Object.values(counts).reduce((a, b) => a + b, 0);
  if (placedRes < 19) {
    return { ok: false as const, errors: ["Bitte alle 19 Rohstoffe setzen (Drag & Drop)."] };
  }

  const want: Record<Resource, number> = {
    holz: 4,
    schaf: 4,
    getreide: 4,
    lehm: 3,
    stein: 3,
    wueste: 1,
  };

  for (const r of VALID_RES) {
    if ((counts[r] ?? 0) !== want[r]) errors.push(`Rohstoff-Anzahl ${r}: ${counts[r] ?? 0} (soll: ${want[r]})`);
  }

  // Number counts
  const numCounts: Record<number, number> = {};
  let numPlaced = 0;

  for (const t of tiles) {
    if (!t.res) continue;

    if (t.res === "wueste") {
      if (t.num !== null) errors.push("Wüste darf keine Zahl haben.");
      continue;
    }

    if (t.num === null) continue;

    if (!VALID_NUM.has(t.num)) errors.push(`Ungültige Zahl: ${t.num}`);
    numCounts[t.num] = (numCounts[t.num] ?? 0) + 1;
    numPlaced++;
  }

  // expected: 18 numbers
  if (numPlaced < 18) {
    errors.push("Bitte alle Zahlen auf Nicht-Wüste Felder setzen (insgesamt 18).");
  }

  const wantNums: Record<number, number> = {
    2: 1,
    3: 2,
    4: 2,
    5: 2,
    6: 2,
    8: 2,
    9: 2,
    10: 2,
    11: 2,
    12: 1,
  };

  for (const n of Object.keys(wantNums).map(Number)) {
    if ((numCounts[n] ?? 0) !== wantNums[n]) {
      errors.push(`Zahl ${n}: ${numCounts[n] ?? 0} (soll: ${wantNums[n]})`);
    }
  }

  return { ok: errors.length === 0, errors };
}