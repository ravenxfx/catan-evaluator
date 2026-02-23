"use client";

import React from "react";
import { DndContext, DragEndEvent, useDraggable, useDroppable } from "@dnd-kit/core";
import { BoardState, Resource, placeResource, keyHex } from "@/lib/boardState";

export type StartMarker = {
  id: string;
  rank: number;
  score: number;
  x: number; // board-local pixel (NO offset)
  y: number; // board-local pixel (NO offset)
};

const RESOURCES: Resource[] = ["holz", "lehm", "schaf", "getreide", "stein", "wueste"];
const NUMBERS = [2, 3, 4, 5, 6, 8, 9, 10, 11, 12];

function resIcon(res: Resource | null) {
  switch (res) {
    case "holz":
      return "🌲";
    case "lehm":
      return "🧱";
    case "schaf":
      return "🐑";
    case "getreide":
      return "🌾";
    case "stein":
      return "⛰️";
    case "wueste":
      return "🏜️";
    default:
      return "⬡";
  }
}

function resColor(res: Resource | null) {
  switch (res) {
    case "holz":
      return "#4ADE80";
    case "lehm":
      return "#FB923C";
    case "schaf":
      return "#A3E635";
    case "getreide":
      return "#FACC15";
    case "stein":
      return "#E5E7EB";
    case "wueste":
      return "#FDBA74";
    default:
      return "#FFFFFF";
  }
}

function pipStrong(num: number | null) {
  return num === 6 || num === 8;
}

function axialToPixel(q: number, r: number, size: number) {
  const x = size * Math.sqrt(3) * (q + r / 2);
  const y = size * (3 / 2) * r;
  return { x, y };
}

function hexPolygon(cx: number, cy: number, size: number) {
  const pts: string[] = [];
  for (let i = 0; i < 6; i++) {
    const angle = (Math.PI / 180) * (60 * i - 30);
    pts.push(`${cx + size * Math.cos(angle)},${cy + size * Math.sin(angle)}`);
  }
  return pts.join(" ");
}

function fieldLabel(q: number, r: number) {
  const row = r === -2 ? "A" : r === -1 ? "B" : r === 0 ? "C" : r === 1 ? "D" : r === 2 ? "E" : "?";
  const startQ = r === -2 ? 0 : r === -1 ? -1 : r === 0 ? -2 : r === 1 ? -2 : r === 2 ? -2 : 0;
  const idx = q - startQ + 1;
  return `${row}${idx}`;
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

function parseCoord(s: string) {
  const [qStr, rStr] = s.split(",");
  return { q: Number(qStr), r: Number(rStr) };
}

function setNumberOnHex(state: BoardState, q: number, r: number, nextNum: number | null): BoardState {
  const next = cloneState(state);
  const idx = findIdx(next, q, r);
  if (idx < 0) return state;

  const tile = next.tiles[idx];
  if (tile.res === null) return state;
  if (tile.res === "wueste") return state;

  const oldNum = tile.num;

  if (oldNum !== null) next.numberPool[oldNum] = (next.numberPool[oldNum] ?? 0) + 1;

  if (nextNum === null) {
    tile.num = null;
    return next;
  }

  if ((next.numberPool[nextNum] ?? 0) <= 0 && oldNum !== nextNum) {
    if (oldNum !== null) {
      next.numberPool[oldNum] = (next.numberPool[oldNum] ?? 0) - 1;
      tile.num = oldNum;
    } else {
      tile.num = null;
    }
    return state;
  }

  if (oldNum !== nextNum) next.numberPool[nextNum] = (next.numberPool[nextNum] ?? 0) - 1;
  tile.num = nextNum;
  return next;
}

function DraggableResourceHex({ res, count }: { res: Resource; count: number }) {
  const id = `poolres:${res}`;
  const disabled = count <= 0;

  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id,
    disabled,
  });

  const style: React.CSSProperties = {
    transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined,
    opacity: disabled ? 0.35 : isDragging ? 0.85 : 1,
    cursor: disabled ? "not-allowed" : "grab",
    height: 72,
  };

  const hexStyle: React.CSSProperties = {
    width: 46,
    height: 46,
    clipPath: "polygon(25% 6.7%, 75% 6.7%, 100% 50%, 75% 93.3%, 25% 93.3%, 0% 50%)",
    background: resColor(res),
  };

  return (
    <button
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className="rounded-2xl border bg-white px-3 py-2 shadow-sm hover:shadow-md transition flex items-center gap-3 shrink-0"
      type="button"
      disabled={disabled}
      title={`${res} ×${count}`}
    >
      <div style={hexStyle} className="flex items-center justify-center text-2xl">
        {resIcon(res)}
      </div>
      <div className="text-left leading-tight">
        <div className="text-sm font-semibold capitalize">{res}</div>
        <div className="text-xs text-slate-500">×{count}</div>
      </div>
    </button>
  );
}

function HexHitArea({
  q,
  r,
  cx,
  cy,
  size,
  hasRes,
  isSelected,
  onSelect,
}: {
  q: number;
  r: number;
  cx: number;
  cy: number;
  size: number;
  hasRes: boolean;
  isSelected: boolean;
  onSelect: () => void;
}) {
  const targetId = `targetres:${q},${r}`;
  const dragId = `hexres:${q},${r}`;

  const drop = useDroppable({ id: targetId });
  const drag = useDraggable({ id: dragId, disabled: !hasRes });

  return (
    <div
      ref={(node) => {
        drop.setNodeRef(node);
        drag.setNodeRef(node);
      }}
      className="absolute pointer-events-auto"
      style={{
        left: cx,
        top: cy,
        width: size * 1.9,
        height: size * 1.9,
        transform: "translate(-50%, -50%)",
        clipPath: "polygon(25% 6.7%, 75% 6.7%, 100% 50%, 75% 93.3%, 25% 93.3%, 0% 50%)",
        background: drop.isOver ? "rgba(0,0,0,0.08)" : "transparent",
        outline: isSelected ? "3px solid #111" : "none",
        borderRadius: 16,
        cursor: hasRes ? "grab" : "pointer",
      }}
      onMouseDown={(e) => {
        e.stopPropagation();
        onSelect();
      }}
      // drag handlers ONLY if draggable
      {...(hasRes ? drag.listeners : {})}
      {...(hasRes ? drag.attributes : {})}
    />
  );
}

export default function DndBoard({
  state,
  setState,
  startMarkers,
  showMarkers = false,
}: {
  state: BoardState;
  setState: (s: BoardState) => void;
  startMarkers?: StartMarker[];
  showMarkers?: boolean;
}) {
  const [selected, setSelected] = React.useState<{ q: number; r: number } | null>(null);
  const [selectedCenter, setSelectedCenter] = React.useState<{ cx: number; cy: number } | null>(null);

  const selectedTile = React.useMemo(() => {
    if (!selected) return null;
    return state.tiles.find((t) => t.q === selected.q && t.r === selected.r) ?? null;
  }, [selected, state.tiles]);

  const poolReturn = useDroppable({ id: "pooldrop:res" });

  function onDragEnd(e: DragEndEvent) {
    const activeId = String(e.active.id);
    const overId = e.over ? String(e.over.id) : null;
    if (!overId) return;

    if (overId === "pooldrop:res" && activeId.startsWith("hexres:")) {
      const coord = activeId.split(":")[1];
      const { q, r } = parseCoord(coord);

      const next = cloneState(state);
      const idx = findIdx(next, q, r);
      if (idx < 0) return;

      const oldRes = next.tiles[idx].res;
      if (!oldRes) return;

      next.tiles[idx].res = null;
      next.resourcePool[oldRes] = (next.resourcePool[oldRes] ?? 0) + 1;

      if (next.tiles[idx].num !== null) {
        const n = next.tiles[idx].num!;
        next.numberPool[n] = (next.numberPool[n] ?? 0) + 1;
        next.tiles[idx].num = null;
      }

      setState(next);
      return;
    }

    if (overId.startsWith("targetres:")) {
      const coord = overId.split(":")[1];
      const { q, r } = parseCoord(coord);

      if (activeId.startsWith("poolres:")) {
        const res = activeId.split(":")[1] as Resource;
        setState(placeResource(state, q, r, res));
        return;
      }

      if (activeId.startsWith("hexres:")) {
        const fromCoord = activeId.split(":")[1];
        const { q: fq, r: fr } = parseCoord(fromCoord);
        if (fq === q && fr === r) return;

        const next = cloneState(state);
        const a = findIdx(next, fq, fr);
        const b = findIdx(next, q, r);
        if (a < 0 || b < 0) return;

        const aRes = next.tiles[a].res;
        if (!aRes) return;

        const bRes = next.tiles[b].res;

        next.tiles[a].res = bRes ?? null;
        next.tiles[b].res = aRes;

        for (const t of [next.tiles[a], next.tiles[b]]) {
          if (t.res === "wueste" && t.num !== null) {
            next.numberPool[t.num] = (next.numberPool[t.num] ?? 0) + 1;
            t.num = null;
          }
        }

        setState(next);
      }
    }
  }

  const size = 58;
  const padding = 110;

  const positions = state.tiles.map((t) => {
    const p = axialToPixel(t.q, t.r, size);
    return { ...t, x: p.x, y: p.y };
  });

  const minX = Math.min(...positions.map((p) => p.x));
  const maxX = Math.max(...positions.map((p) => p.x));
  const minY = Math.min(...positions.map((p) => p.y));
  const maxY = Math.max(...positions.map((p) => p.y));

  const width = maxX - minX + padding * 2;
  const height = maxY - minY + padding * 2;
  const offsetX = padding - minX;
  const offsetY = padding - minY;

  const canEditNumber = !!selectedTile && selectedTile.res !== null && selectedTile.res !== "wueste";

  React.useEffect(() => {
    function onDown(e: MouseEvent) {
      const el = e.target as HTMLElement;
      if (el.closest?.("[data-popover='num']")) return;
      if (el.closest?.("[data-board-wrap='1']")) return;
      setSelected(null);
      setSelectedCenter(null);
    }
    window.addEventListener("mousedown", onDown);
    return () => window.removeEventListener("mousedown", onDown);
  }, []);

  return (
    <DndContext onDragEnd={onDragEnd}>
      <div className="space-y-4">
        <div className="flex items-center gap-2 overflow-x-auto flex-nowrap pb-2">
          {RESOURCES.map((r) => (
            <DraggableResourceHex key={r} res={r} count={state.resourcePool[r]} />
          ))}

          <div className="flex-1" />

          <div
            ref={poolReturn.setNodeRef}
            className={`rounded-2xl border px-4 py-3 text-sm bg-white shadow-sm shrink-0 ${
              poolReturn.isOver ? "ring-2 ring-black" : ""
            }`}
            style={{ height: 72 }}
            title="Rohstoff vom Board hierher ziehen → zurück in den Pool"
          >
            ↩︎ Zurücklegen
            <div className="text-xs text-slate-500">drag vom Feld → hier</div>
          </div>
        </div>

        <div data-board-wrap="1" className="relative rounded-2xl border bg-slate-100 shadow-sm p-4 flex justify-center" style={{ minHeight: 640 }}>
          {selected && selectedCenter && (
            <div
              data-popover="num"
              className="absolute z-20 rounded-2xl border bg-white shadow-lg p-3"
              style={{
                left: selectedCenter.cx,
                top: selectedCenter.cy,
                transform: "translate(-50%, -120%)",
                width: 360,
              }}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-sm font-semibold">Zahl wählen</div>
                  <div className="text-xs text-slate-500">
                    {selectedTile ? (
                      <>
                        Feld <span className="font-mono font-semibold">{fieldLabel(selectedTile.q, selectedTile.r)}</span>{" "}
                        {selectedTile.res ? `· ${selectedTile.res}` : ""}
                      </>
                    ) : (
                      "Kein Feld"
                    )}
                  </div>
                </div>
                <button
                  className="text-xs rounded-lg border px-2 py-1"
                  type="button"
                  onClick={() => {
                    setSelected(null);
                    setSelectedCenter(null);
                  }}
                >
                  ✕
                </button>
              </div>

              <div className="mt-2 flex flex-wrap gap-2">
                <button
                  className={`rounded-xl border px-3 py-2 text-sm ${
                    canEditNumber ? "bg-white hover:bg-slate-50" : "opacity-40 cursor-not-allowed"
                  }`}
                  type="button"
                  disabled={!canEditNumber}
                  onClick={() => {
                    if (!selectedTile) return;
                    setState(setNumberOnHex(state, selectedTile.q, selectedTile.r, null));
                  }}
                >
                  leer
                </button>

                {NUMBERS.map((n) => {
                  const stock = state.numberPool[n] ?? 0;
                  const isCurrent = selectedTile?.num === n;
                  const disabled = !canEditNumber || (!isCurrent && stock <= 0);
                  const strong = n === 6 || n === 8;

                  return (
                    <button
                      key={n}
                      disabled={disabled}
                      className={`rounded-xl border px-3 py-2 text-sm font-mono transition ${
                        disabled ? "opacity-40 cursor-not-allowed" : "bg-white hover:bg-slate-50"
                      } ${strong ? "text-red-600 font-semibold" : ""} ${isCurrent ? "bg-black text-white hover:bg-black" : ""}`}
                      type="button"
                      onClick={() => {
                        if (!selectedTile) return;
                        setState(setNumberOnHex(state, selectedTile.q, selectedTile.r, n));
                      }}
                    >
                      {n}
                      <span className="ml-2 text-xs text-slate-400">{isCurrent ? "" : `×${stock}`}</span>
                    </button>
                  );
                })}
              </div>

              {!canEditNumber && <div className="mt-2 text-xs text-amber-700">Zahlen gehen nur auf Nicht-Wüste Felder.</div>}
            </div>
          )}

          {/* HTML overlay: BOTH drop + drag */}
          <div className="absolute inset-0 flex justify-center" style={{ padding: 16 }}>
            <div className="relative" style={{ width: "100%", maxWidth: 920, height: 620 }}>
              {state.tiles.map((t) => {
                const p = axialToPixel(t.q, t.r, size);
                const cx = p.x + offsetX;
                const cy = p.y + offsetY;
                const isSel = !!selected && selected.q === t.q && selected.r === t.r;

                return (
                  <HexHitArea
                    key={`hit-${keyHex(t.q, t.r)}`}
                    q={t.q}
                    r={t.r}
                    cx={cx}
                    cy={cy}
                    size={size}
                    hasRes={!!t.res}
                    isSelected={isSel}
                    onSelect={() => {
                      setSelected({ q: t.q, r: t.r });
                      setSelectedCenter({ cx, cy });
                    }}
                  />
                );
              })}
            </div>
          </div>

          {/* SVG render */}
          <svg viewBox={`0 0 ${width} ${height}`} style={{ width: "100%", maxWidth: 920, height: 620 }}>
            {state.tiles.map((t) => {
              const p = axialToPixel(t.q, t.r, size);
              const cx = p.x + offsetX;
              const cy = p.y + offsetY;
              const poly = hexPolygon(cx, cy, size);

              const isSel = !!selected && selected.q === t.q && selected.r === t.r;

              return (
                <g key={keyHex(t.q, t.r)}>
                  <polygon points={poly} fill={resColor(t.res)} stroke={isSel ? "#111" : "#2b2b2b"} strokeWidth={isSel ? 3 : 1.2} />

                  <text x={cx} y={cy - 26} textAnchor="middle" fontSize="11" fill="#111" pointerEvents="none">
                    {fieldLabel(t.q, t.r)}
                  </text>

                  <text x={cx} y={cy - 4} textAnchor="middle" fontSize="22" pointerEvents="none">
                    {resIcon(t.res)}
                  </text>

                  <circle cx={cx} cy={cy + 22} r={15} fill="#fff" stroke="#111" strokeWidth={1} pointerEvents="none" />
                  <text
                    x={cx}
                    y={cy + 26}
                    textAnchor="middle"
                    fontSize="12"
                    fill={pipStrong(t.num) ? "#dc2626" : "#111"}
                    fontWeight={pipStrong(t.num) ? "800" : "600"}
                    pointerEvents="none"
                  >
                    {t.num ?? ""}
                  </text>
                </g>
              );
            })}

            {showMarkers &&
              (startMarkers ?? []).map((m) => {
                const mx = m.x + offsetX;
                const my = m.y + offsetY;
                return (
                  <g key={m.id}>
                    <circle cx={mx} cy={my} r={13} fill="#111" opacity={0.92} />
                    <circle cx={mx} cy={my} r={14} fill="transparent" stroke="#fff" strokeWidth={1.8} opacity={0.95} />
                    <text x={mx} y={my + 4} textAnchor="middle" fontSize="11" fill="#fff" fontWeight={800} pointerEvents="none">
                      {m.rank}
                    </text>
                  </g>
                );
              })}
          </svg>
        </div>
      </div>
    </DndContext>
  );
}