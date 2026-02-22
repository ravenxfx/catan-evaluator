"use client";

import React from "react";

export type Tile = { q: number; r: number; res: string; num: number | null };

const RES_OPTIONS = ["holz", "lehm", "schaf", "getreide", "stein", "wueste"] as const;
const NUM_OPTIONS = [2,3,4,5,6,8,9,10,11,12] as const;

// 19 hex coords (3-4-5-4-3)
export const HEXES: Array<{ q: number; r: number }> = [
  { q: 0, r: -2 }, { q: 1, r: -2 }, { q: 2, r: -2 },
  { q: -1, r: -1 }, { q: 0, r: -1 }, { q: 1, r: -1 }, { q: 2, r: -1 },
  { q: -2, r: 0 }, { q: -1, r: 0 }, { q: 0, r: 0 }, { q: 1, r: 0 }, { q: 2, r: 0 },
  { q: -2, r: 1 }, { q: -1, r: 1 }, { q: 0, r: 1 }, { q: 1, r: 1 },
  { q: -2, r: 2 }, { q: -1, r: 2 }, { q: 0, r: 2 },
];

function key(q:number,r:number){ return `${q},${r}`; }

function hexPolygon(cx:number, cy:number, size:number) {
  // pointy-top hex
  const pts: string[] = [];
  for (let i = 0; i < 6; i++) {
    const angle = (Math.PI / 180) * (60 * i - 30);
    const x = cx + size * Math.cos(angle);
    const y = cy + size * Math.sin(angle);
    pts.push(`${x},${y}`);
  }
  return pts.join(" ");
}

function axialToPixel(q:number, r:number, size:number) {
  // pointy-top axial -> pixel
  const x = size * Math.sqrt(3) * (q + r/2);
  const y = size * (3/2) * r;
  return { x, y };
}

function resColor(res: string) {
  switch (res) {
    case "holz": return "bg-green-100";
    case "lehm": return "bg-orange-100";
    case "schaf": return "bg-lime-100";
    case "getreide": return "bg-yellow-100";
    case "stein": return "bg-gray-100";
    case "wueste": return "bg-amber-50";
    default: return "bg-white";
  }
}

export function makeEmptyTiles(): Tile[] {
  return HEXES.map(h => ({ q: h.q, r: h.r, res: "holz", num: 11 })); // placeholder
}

export default function BoardEditor({
  tiles,
  onChange,
}: {
  tiles: Tile[];
  onChange: (tiles: Tile[]) => void;
}) {
  const [selected, setSelected] = React.useState<{ q: number; r: number } | null>(null);

  const map = React.useMemo(() => {
    const m = new Map<string, Tile>();
    for (const t of tiles) m.set(key(t.q,t.r), t);
    return m;
  }, [tiles]);

  function updateTile(q:number, r:number, patch: Partial<Tile>) {
    const k = key(q,r);
    const current = map.get(k);
    if (!current) return;
    const next = tiles.map(t => (t.q===q && t.r===r ? { ...t, ...patch } : t));
    onChange(next);
  }

  const size = 42;
  const padding = 60;

  // compute bounds
  const positions = HEXES.map(h => {
    const p = axialToPixel(h.q,h.r,size);
    return { ...h, x: p.x, y: p.y };
  });
  const minX = Math.min(...positions.map(p=>p.x));
  const maxX = Math.max(...positions.map(p=>p.x));
  const minY = Math.min(...positions.map(p=>p.y));
  const maxY = Math.max(...positions.map(p=>p.y));

  const width = (maxX - minX) + padding*2;
  const height = (maxY - minY) + padding*2;

  const selectedTile = selected ? map.get(key(selected.q, selected.r)) : null;

  return (
    <div className="flex flex-col gap-3">
      <div className="rounded border p-3">
        <svg width={width} height={height} className="block w-full">
          {positions.map((p) => {
            const t = map.get(key(p.q,p.r));
            const cx = (p.x - minX) + padding;
            const cy = (p.y - minY) + padding;
            const poly = hexPolygon(cx, cy, size);
            const isSel = selected && selected.q===p.q && selected.r===p.r;

            return (
              <g key={key(p.q,p.r)} onClick={() => setSelected({ q: p.q, r: p.r })} style={{ cursor: "pointer" }}>
                <polygon
                  points={poly}
                  className={`${t ? resColor(t.res) : "bg-white"}`}
                  fill="white"
                  stroke={isSel ? "black" : "#555"}
                  strokeWidth={isSel ? 3 : 1.2}
                />
                {/* Resource label */}
                <text x={cx} y={cy-4} textAnchor="middle" fontSize="12" fill="#111">
                  {t?.res ?? ""}
                </text>
                {/* Number token */}
                <circle cx={cx} cy={cy+16} r={14} fill="#fff" stroke="#333" strokeWidth={1} />
                <text x={cx} y={cy+20} textAnchor="middle" fontSize="12" fill="#111">
                  {t?.num ?? ""}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      <div className="rounded border p-3">
        <div className="font-medium mb-2">Auswahl</div>
        {selectedTile ? (
          <div className="space-y-3">
            <div className="text-sm text-gray-600 font-mono">
              Feld: ({selectedTile.q},{selectedTile.r})
            </div>

            <div>
              <div className="text-sm font-medium mb-1">Rohstoff</div>
              <div className="flex flex-wrap gap-2">
                {RES_OPTIONS.map((res) => (
                  <button
                    key={res}
                    className={`px-3 py-1 rounded border text-sm ${
                      selectedTile.res === res ? "bg-black text-white" : "bg-white"
                    }`}
                    onClick={() => {
                      if (!selected) return;
                      if (res === "wueste") {
                        updateTile(selected.q, selected.r, { res, num: null });
                      } else {
                        // if coming from desert and num is null, set default number
                        updateTile(selected.q, selected.r, { res, num: selectedTile.num ?? 11 });
                      }
                    }}
                    type="button"
                  >
                    {res}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <div className="text-sm font-medium mb-1">Zahl</div>
              <select
                className="rounded border px-2 py-1 text-sm"
                value={selectedTile.num ?? ""}
                disabled={selectedTile.res === "wueste"}
                onChange={(e) => {
                  if (!selected) return;
                  const v = e.target.value;
                  updateTile(selected.q, selected.r, { num: v === "" ? null : Number(v) });
                }}
              >
                <option value="">(leer)</option>
                {NUM_OPTIONS.map((n) => (
                  <option key={n} value={n}>{n}</option>
                ))}
              </select>
              {selectedTile.res === "wueste" && (
                <div className="text-xs text-gray-500 mt-1">Wüste hat keine Zahl.</div>
              )}
            </div>
          </div>
        ) : (
          <div className="text-sm text-gray-600">Klicke ein Feld im Brett an.</div>
        )}
      </div>
    </div>
  );
}