export type Resource = "holz" | "lehm" | "schaf" | "getreide" | "stein" | "wueste";

export type BoardTile = {
  q: number;
  r: number;
  res: Resource | null;
  num: number | null;
};

export type BoardState = {
  tiles: BoardTile[];
  resourcePool: Record<Resource, number>;
  numberPool: Record<number, number>;
};

export function keyHex(q: number, r: number) {
  return `${q},${r}`;
}

// Standard 19-hex axial coords (pointy-top), rows A..E
export const HEX_COORDS: Array<{ q: number; r: number }> = [
  // r = -2 (A) : q 0..2
  { q: 0, r: -2 },
  { q: 1, r: -2 },
  { q: 2, r: -2 },

  // r = -1 (B) : q -1..2
  { q: -1, r: -1 },
  { q: 0, r: -1 },
  { q: 1, r: -1 },
  { q: 2, r: -1 },

  // r = 0 (C) : q -2..2
  { q: -2, r: 0 },
  { q: -1, r: 0 },
  { q: 0, r: 0 },
  { q: 1, r: 0 },
  { q: 2, r: 0 },

  // r = 1 (D) : q -2..1
  { q: -2, r: 1 },
  { q: -1, r: 1 },
  { q: 0, r: 1 },
  { q: 1, r: 1 },

  // r = 2 (E) : q -2..0
  { q: -2, r: 2 },
  { q: -1, r: 2 },
  { q: 0, r: 2 },
];

export function makeInitialState(): BoardState {
  const tiles: BoardTile[] = HEX_COORDS.map(({ q, r }) => ({ q, r, res: null, num: null }));

  const resourcePool: Record<Resource, number> = {
    holz: 4,
    schaf: 4,
    getreide: 4,
    lehm: 3,
    stein: 3,
    wueste: 1,
  };

  // catan numbers: 2/12 x1, 3..11 (except 7) x2
  const numberPool: Record<number, number> = {
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

  return { tiles, resourcePool, numberPool };
}

function cloneState(state: BoardState): BoardState {
  return {
    tiles: state.tiles.map((t) => ({ ...t })),
    resourcePool: { ...state.resourcePool },
    numberPool: { ...state.numberPool },
  };
}

function findIdx(state: BoardState, q: number, r: number) {
  return state.tiles.findIndex((t) => t.q === q && t.r === r);
}

/**
 * Place a resource from pool onto (q,r). If a resource already exists there, it goes back to the pool.
 * Desert forces num=null.
 */
export function placeResource(state: BoardState, q: number, r: number, res: Resource): BoardState {
  const next = cloneState(state);
  const idx = findIdx(next, q, r);
  if (idx < 0) return state;

  // must be available
  if ((next.resourcePool[res] ?? 0) <= 0) return state;

  const oldRes = next.tiles[idx].res;
  if (oldRes) {
    next.resourcePool[oldRes] = (next.resourcePool[oldRes] ?? 0) + 1;
  }

  next.resourcePool[res] = (next.resourcePool[res] ?? 0) - 1;
  next.tiles[idx].res = res;

  if (res === "wueste") {
    // return number to pool if any
    const oldNum = next.tiles[idx].num;
    if (oldNum !== null) next.numberPool[oldNum] = (next.numberPool[oldNum] ?? 0) + 1;
    next.tiles[idx].num = null;
  }

  return next;
}