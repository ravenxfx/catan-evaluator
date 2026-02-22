import type { Resource } from "@/lib/boardState";

export type Tile = {
  q: number;
  r: number;
  res: Resource | "" | null;
  num: number | null;
};

export function pipValue(num: number | null) {
  if (num === null) return 0;
  if (num === 6 || num === 8) return 5;
  if (num === 5 || num === 9) return 4;
  if (num === 4 || num === 10) return 3;
  if (num === 3 || num === 11) return 2;
  if (num === 2 || num === 12) return 1;
  return 0;
}