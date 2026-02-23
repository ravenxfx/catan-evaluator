export type Resource = "holz" | "lehm" | "schaf" | "getreide" | "stein" | "wueste";

export type Tile = {
  q: number;
  r: number;
  res: Resource | null;
  num: number | null; // desert or empty can be null
};

export type PlayerCount = 3 | 4;

export const RESOURCE_COUNTS: Record<Resource, number> = {
  holz: 4,
  schaf: 4,
  getreide: 4,
  lehm: 3,
  stein: 3,
  wueste: 1,
};

export const NUMBER_COUNTS: Record<number, number> = {
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

export const NUMBER_LIST: number[] = [2, 3, 4, 5, 6, 8, 9, 10, 11, 12];