"use client";

import React from "react";
import { balanceScore, bestStartSpots, randomizeBoard } from "@/lib/catan/scoring";
import { isRed, pipValue } from "@/lib/catan/pips";
import { NUMBER_COUNTS, NUMBER_LIST, PlayerCount, Resource, RESOURCE_COUNTS, Tile } from "@/lib/catan/types";

const CANVAS_W = 920;
const CANVAS_H = 620;
const PREMIUM_THRESHOLD = 90;

type Mode = "builder" | "random";

function resEmoji(res: Resource | null) {
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

function resLabel(res: Resource | null) {
  switch (res) {
    case "holz":
      return "Wood";
    case "lehm":
      return "Brick";
    case "schaf":
      return "Sheep";
    case "getreide":
      return "Wheat";
    case "stein":
      return "Ore";
    case "wueste":
      return "Desert";
    default:
      return "Empty";
  }
}

function resColor(res: Resource | null) {
  switch (res) {
    case "holz":
      return "#16a34a";
    case "lehm":
      return "#ea580c";
    case "schaf":
      return "#65a30d";
    case "getreide":
      return "#ca8a04";
    case "stein":
      return "#cbd5e1";
    case "wueste":
      return "#f59e0b";
    default:
      return "#ffffff";
  }
}

function balanceTone(score: number) {
  if (score >= PREMIUM_THRESHOLD) return "from-emerald-600 to-emerald-800";
  if (score >= 80) return "from-lime-500 to-lime-700";
  if (score >= 65) return "from-amber-400 to-amber-600";
  if (score >= 50) return "from-orange-400 to-orange-600";
  return "from-red-500 to-red-700";
}

function balanceRing(score: number) {
  if (score >= PREMIUM_THRESHOLD) return "ring-emerald-300/60";
  if (score >= 80) return "ring-lime-300/60";
  if (score >= 65) return "ring-amber-300/60";
  if (score >= 50) return "ring-orange-300/60";
  return "ring-red-300/60";
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

function createPoolsFromTiles(tiles: Tile[]) {
  const resLeft: Record<Resource, number> = { ...RESOURCE_COUNTS };
  for (const t of tiles) if (t.res) resLeft[t.res] = Math.max(0, (resLeft[t.res] ?? 0) - 1);

  const numLeft: Record<number, number> = { ...NUMBER_COUNTS };
  for (const t of tiles) if (t.num != null) numLeft[t.num] = Math.max(0, (numLeft[t.num] ?? 0) - 1);

  return { resLeft, numLeft };
}

function makeDefaultTiles(): Tile[] {
  const tiles: Tile[] = [];
  const R = 2;
  for (let q = -R; q <= R; q++) {
    for (let r = -R; r <= R; r++) {
      const s = -q - r;
      if (Math.max(Math.abs(q), Math.abs(r), Math.abs(s)) <= R) tiles.push({ q, r, res: null, num: null });
    }
  }
  tiles.sort((a, b) => (a.r !== b.r ? a.r - b.r : a.q - b.q));
  return tiles;
}

function tilesClone(tiles: Tile[]): Tile[] {
  return tiles.map((t) => ({ ...t }));
}

export default function BoardEditor({
  tiles,
  onChange,
  mode = "builder",
  playerCount,
  onPlayerCountChange,
  premium,
  onPremiumChange,
  showStartSpotList = false,
  onRandomizeExternal,
  onResetExternal,
}: {
  tiles: Tile[];
  onChange: (tiles: Tile[]) => void;
  mode?: Mode;

  // let pages control these (so both pages behave consistently)
  playerCount: PlayerCount;
  onPlayerCountChange: (p: PlayerCount) => void;

  premium: boolean;
  onPremiumChange: (p: boolean) => void;

  // random page may want a list; evaluate page can disable it
  showStartSpotList?: boolean;

  // optional: let page provide its own randomize/reset buttons;
  // if not provided, builder will show them.
  onRandomizeExternal?: () => void;
  onResetExternal?: () => void;
}) {
  const size = 58;
  const padding = 90;

  const isBuilder = mode === "builder";

  const [brush, setBrush] = React.useState<Resource | "erase" | null>("holz");
  const [selected, setSelected] = React.useState<{ q: number; r: number } | null>(null);
  const [selectedCenter, setSelectedCenter] = React.useState<{ cx: number; cy: number } | null>(null);

  const hostRef = React.useRef<HTMLDivElement | null>(null);
  const [scale, setScale] = React.useState(1);

  const [toast, setToast] = React.useState<string | null>(null);
  const toastTimer = React.useRef<number | null>(null);

  function showToast(msg: string) {
    setToast(msg);
    if (toastTimer.current) window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(null), 2000);
  }

  React.useEffect(() => {
    function recompute() {
      const el = hostRef.current;
      if (!el) return;
      const w = el.clientWidth;
      const s = Math.min(1, (w - 12) / CANVAS_W);
      setScale(Number.isFinite(s) ? Math.max(0.55, s) : 1);
    }
    recompute();
    window.addEventListener("resize", recompute);
    return () => window.removeEventListener("resize", recompute);
  }, []);

  const { resLeft, numLeft } = React.useMemo(() => createPoolsFromTiles(tiles), [tiles]);

  const positions = React.useMemo(() => {
    return tiles.map((t) => {
      const p = axialToPixel(t.q, t.r, size);
      return { ...t, x: p.x, y: p.y };
    });
  }, [tiles]);

  const { offsetX, offsetY } = React.useMemo(() => {
    const minX = Math.min(...positions.map((p) => p.x));
    const maxX = Math.max(...positions.map((p) => p.x));
    const minY = Math.min(...positions.map((p) => p.y));
    const maxY = Math.max(...positions.map((p) => p.y));
    const contentW = maxX - minX + padding * 2;
    const contentH = maxY - minY + padding * 2;
    const ox = (CANVAS_W - contentW) / 2 + padding - minX;
    const oy = (CANVAS_H - contentH) / 2 + padding - minY;
    return { offsetX: ox, offsetY: oy };
  }, [positions]);

  const selectedTile = React.useMemo(() => {
    if (!selected) return null;
    return tiles.find((t) => t.q === selected.q && t.r === selected.r) ?? null;
  }, [selected, tiles]);

  const canEditNumber = isBuilder && !!selectedTile && selectedTile.res !== null && selectedTile.res !== "wueste";
  const metrics = React.useMemo(() => balanceScore(tiles), [tiles]);

  const startSpots = React.useMemo(() => bestStartSpots(tiles, playerCount), [tiles, playerCount]);
  const topN = playerCount === 3 ? 6 : 8;

  function applyBrushToTile(q: number, r: number) {
    if (!isBuilder) return;

    const idx = tiles.findIndex((t) => t.q === q && t.r === r);
    if (idx < 0) return;

    const next = tilesClone(tiles);
    const t = next[idx];

    if (brush === null) return;

    if (brush === "erase") {
      t.res = null;
      t.num = null;
      onChange(next);
      return;
    }

    const curRes = t.res;
    if (curRes !== brush && resLeft[brush] <= 0) return;

    t.res = brush;
    if (brush === "wueste") t.num = null;

    onChange(next);
  }

  function setNumber(q: number, r: number, n: number | null) {
    if (!isBuilder) return;

    const idx = tiles.findIndex((t) => t.q === q && t.r === r);
    if (idx < 0) return;

    const next = tilesClone(tiles);
    const t = next[idx];

    if (!t.res || t.res === "wueste") return;

    const old = t.num;

    if (n === null) {
      t.num = null;
      onChange(next);
      return;
    }

    const available = (numLeft[n] ?? 0) > 0;
    if (!available && old !== n) return;

    t.num = n;
    onChange(next);
  }

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

  function resetBoardInternal() {
    onChange(makeDefaultTiles());
    setSelected(null);
    setSelectedCenter(null);
    setBrush("holz");
    showToast("Reset ✅");
  }

  function randomizeInternal() {
    onChange(randomizeBoard(tiles));
    setSelected(null);
    setSelectedCenter(null);
    showToast("Randomized 🎲");
  }

  const isPremiumFair = metrics.score >= PREMIUM_THRESHOLD;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_380px] gap-3">
      {/* LEFT */}
      <div className="space-y-3">
        {/* Builder toolbar (only on /evaluate) */}
        {isBuilder ? (
          <div className="rounded-2xl border bg-white shadow-sm p-2">
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2 overflow-x-auto pb-1">
                {(Object.keys(RESOURCE_COUNTS) as Resource[]).map((r) => {
                  const active = brush === r;
                  const disabled = resLeft[r] <= 0 && !active;
                  return (
                    <button
                      key={r}
                      type="button"
                      disabled={disabled}
                      onClick={() => setBrush(r)}
                      className={`shrink-0 rounded-2xl border px-3 py-2 flex items-center gap-2 shadow-sm transition ${
                        active ? "bg-black text-white border-black" : "bg-white hover:shadow-md"
                      } ${disabled ? "opacity-40 cursor-not-allowed" : ""}`}
                      title={`${resLabel(r)} remaining: ${resLeft[r]}`}
                    >
                      <span
                        className="inline-flex items-center justify-center text-xl"
                        style={{
                          width: 34,
                          height: 34,
                          background: resColor(r),
                          clipPath:
                            "polygon(25% 6.7%, 75% 6.7%, 100% 50%, 75% 93.3%, 25% 93.3%, 0% 50%)",
                        }}
                      >
                        {resEmoji(r)}
                      </span>
                      <div className="text-left leading-tight">
                        <div className="text-sm font-semibold">{resLabel(r)}</div>
                        <div className={`text-xs ${active ? "text-white/70" : "text-slate-500"}`}>{resLeft[r]} left</div>
                      </div>
                    </button>
                  );
                })}

                <button
                  type="button"
                  onClick={() => setBrush("erase")}
                  className={`shrink-0 rounded-2xl border px-3 py-2 flex items-center gap-2 shadow-sm transition ${
                    brush === "erase" ? "bg-black text-white border-black" : "bg-white hover:shadow-md"
                  }`}
                  title="Erase (clear resource + number)"
                >
                  <span className="inline-flex items-center justify-center text-xl" style={{ width: 34, height: 34 }}>
                    🧽
                  </span>
                  <div className="text-left leading-tight">
                    <div className="text-sm font-semibold">Erase</div>
                    <div className={`text-xs ${brush === "erase" ? "text-white/70" : "text-slate-500"}`}>clear</div>
                  </div>
                </button>
              </div>

              <div className="flex items-center justify-between gap-2">
                <div className="text-xs text-slate-500">Pick a brush → click hexes. Click hex again to set its number.</div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={onRandomizeExternal ?? randomizeInternal}
                    className="rounded-xl border bg-white px-3 py-2 text-sm shadow-sm hover:shadow-md transition"
                    type="button"
                  >
                    Randomize
                  </button>
                  <button
                    onClick={onResetExternal ?? resetBoardInternal}
                    className="rounded-xl border bg-white px-3 py-2 text-sm shadow-sm hover:shadow-md transition"
                    type="button"
                  >
                    Reset
                  </button>
                </div>
              </div>
            </div>
          </div>
        ) : null}

        {/* BOARD */}
       <div
  data-board-wrap="1"
  ref={hostRef}
  className="
    relative flex justify-center overflow-hidden
    -mx-2 sm:mx-0
    rounded-none sm:rounded-3xl
    border-y sm:border
    bg-gradient-to-b from-slate-100 to-slate-50
    shadow-none sm:shadow-sm
    p-1.5 sm:p-2
  "
>
          {toast ? (
            <div className="absolute z-50 top-3 left-1/2 -translate-x-1/2 rounded-2xl border bg-white/95 shadow-lg px-3 py-2 text-sm">
              {toast}
            </div>
          ) : null}

          <div
            className="relative"
            style={{
              width: CANVAS_W,
              height: CANVAS_H,
              transform: `scale(${scale})`,
              transformOrigin: "top center",
            }}
          >
            {/* Number popover (builder only) */}
            {isBuilder && selected && selectedCenter ? (
              <div
                data-popover="num"
                className="absolute z-40 rounded-2xl border bg-white shadow-lg p-3"
                style={{
                  left: selectedCenter.cx,
                  top: selectedCenter.cy,
                  transform: "translate(-50%, -120%)",
                  width: 340,
                }}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-sm font-semibold">Choose number</div>
                    <div className="text-xs text-slate-500">
                      {selectedTile ? (
                        <>
                          Tile <span className="font-mono font-semibold">{fieldLabel(selectedTile.q, selectedTile.r)}</span>{" "}
                          {selectedTile.res ? `· ${resLabel(selectedTile.res)}` : "· (empty)"}
                        </>
                      ) : (
                        "No tile"
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
                      setNumber(selectedTile.q, selectedTile.r, null);
                    }}
                  >
                    empty
                  </button>

                  {NUMBER_LIST.map((n) => {
                    const stock = numLeft[n] ?? 0;
                    const isCurrent = selectedTile?.num === n;
                    const disabled = !canEditNumber || (!isCurrent && stock <= 0);

                    return (
                      <button
                        key={n}
                        disabled={disabled}
                        className={`rounded-xl border px-3 py-2 text-sm font-mono transition ${
                          disabled ? "opacity-40 cursor-not-allowed" : "bg-white hover:bg-slate-50"
                        } ${isRed(n) ? "text-red-600 font-semibold" : ""} ${
                          isCurrent ? "bg-black text-white hover:bg-black" : ""
                        }`}
                        type="button"
                        onClick={() => {
                          if (!selectedTile) return;
                          setNumber(selectedTile.q, selectedTile.r, n);
                        }}
                      >
                        {n}
                        <span className="ml-2 text-xs text-slate-400">{isCurrent ? "" : `×${stock}`}</span>
                      </button>
                    );
                  })}
                </div>

                {!canEditNumber ? (
                  <div className="mt-2 text-xs text-amber-700">Numbers only work on non-desert resource tiles.</div>
                ) : null}
              </div>
            ) : null}

            {/* Click hit-areas */}
            {tiles.map((t) => {
              const p = axialToPixel(t.q, t.r, size);
              const cx = p.x + offsetX;
              const cy = p.y + offsetY;
              const isSel = selected?.q === t.q && selected?.r === t.r;

              return (
                <div
                  key={`hit-${t.q},${t.r}`}
                  className="absolute"
                  style={{
                    left: cx,
                    top: cy,
                    width: size * 1.9,
                    height: size * 1.9,
                    transform: "translate(-50%, -50%)",
                    clipPath:
                      "polygon(25% 6.7%, 75% 6.7%, 100% 50%, 75% 93.3%, 25% 93.3%, 0% 50%)",
                    background: isSel ? "rgba(0,0,0,0.05)" : "transparent",
                    outline: isSel ? "3px solid #111" : "none",
                    borderRadius: 16,
                    cursor: isBuilder ? "pointer" : "default",
                    touchAction: "manipulation",
                    zIndex: 20,
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (!isBuilder) return;

                    applyBrushToTile(t.q, t.r);
                    setSelected({ q: t.q, r: t.r });
                    setSelectedCenter({ cx, cy });
                  }}
                />
              );
            })}

            {/* SVG visuals */}
            <svg
              width={CANVAS_W}
              height={CANVAS_H}
              viewBox={`0 0 ${CANVAS_W} ${CANVAS_H}`}
              className="absolute inset-0"
              style={{ pointerEvents: "none" }}
            >
              {tiles.map((t) => {
                const p = axialToPixel(t.q, t.r, size);
                const cx = p.x + offsetX;
                const cy = p.y + offsetY;
                const poly = hexPolygon(cx, cy, size);

                return (
                  <g key={`hex-${t.q},${t.r}`}>
                    <polygon points={poly} fill={resColor(t.res)} stroke="#2b2b2b" strokeWidth={1.2} />

                    <text x={cx} y={cy - 26} textAnchor="middle" fontSize="11" fill="#111">
                      {fieldLabel(t.q, t.r)}
                    </text>

                    <text x={cx} y={cy - 4} textAnchor="middle" fontSize="22">
                      {resEmoji(t.res)}
                    </text>

                    <circle cx={cx} cy={cy + 22} r={15} fill="#fff" stroke="#111" strokeWidth={1} />
                    <text
                      x={cx}
                      y={cy + 26}
                      textAnchor="middle"
                      fontSize="12"
                      fill={isRed(t.num) ? "#dc2626" : "#111"}
                      fontWeight={isRed(t.num) ? "800" : "600"}
                    >
                      {t.num ?? ""}
                    </text>

                    {t.num != null && t.res && t.res !== "wueste" ? (
                      <text x={cx} y={cy + 46} textAnchor="middle" fontSize="10" fill="#64748b">
                        pips {pipValue(t.num)}
                      </text>
                    ) : null}
                  </g>
                );
              })}

              {/* Premium-only start markers */}
              {premium
                ? startSpots.slice(0, topN).map((v) => {
                    const mx = v.x + offsetX;
                    const my = v.y + offsetY;
                    return (
                      <g key={`m-${v.id}`}>
                        <circle cx={mx} cy={my} r={13} fill="#111" opacity={0.92} />
                        <circle cx={mx} cy={my} r={14} fill="transparent" stroke="#fff" strokeWidth={1.8} opacity={0.95} />
                        <text x={mx} y={my + 4} textAnchor="middle" fontSize="11" fill="#fff" fontWeight={800}>
                          {v.rank}
                        </text>
                      </g>
                    );
                  })
                : null}
            </svg>
          </div>
        </div>
      </div>

      {/* RIGHT */}
      <aside className="space-y-3">
        <BalanceHero score={metrics.score} />

        <div className="rounded-3xl border bg-white shadow-sm p-3">
          <div className="flex items-center justify-between gap-2">
            <div className="text-sm font-semibold">Premium</div>
            <button
              type="button"
              className={`rounded-xl border px-3 py-2 text-sm shadow-sm transition ${
                premium ? "bg-black text-white border-black" : "bg-white hover:shadow-md"
              }`}
              onClick={() => onPremiumChange(!premium)}
            >
              {premium ? "On" : "Off"}
            </button>
          </div>

          <div className="mt-3 flex items-center justify-between gap-2">
            <div className="text-sm text-slate-600">Players</div>
            <div className="flex gap-2">
              <button
                type="button"
                className={`rounded-xl border px-3 py-2 text-sm ${playerCount === 3 ? "bg-black text-white border-black" : "bg-white"}`}
                onClick={() => onPlayerCountChange(3)}
              >
                3
              </button>
              <button
                type="button"
                className={`rounded-xl border px-3 py-2 text-sm ${playerCount === 4 ? "bg-black text-white border-black" : "bg-white"}`}
                onClick={() => onPlayerCountChange(4)}
              >
                4
              </button>
            </div>
          </div>

          <div className="mt-2 text-xs text-slate-500">
            Premium shows the start position markers on the board.
          </div>
        </div>

        {showStartSpotList ? (
          <div className="rounded-3xl border bg-white shadow-sm p-3">
            <div className="flex items-center justify-between">
              <div className="text-sm font-semibold">Best Start Spots</div>
              <div className="text-xs text-slate-500">{playerCount === 3 ? "Top 6" : "Top 8"}</div>
            </div>

            {!premium ? (
              <div className="mt-2 text-sm text-slate-600">Premium is off → hidden.</div>
            ) : (
              <div className="mt-2 space-y-2">
                {startSpots.slice(0, topN).map((s) => (
                  <div key={s.id} className="flex items-center justify-between rounded-2xl border bg-slate-50 px-3 py-2">
                    <div className="flex items-center gap-2">
                      <div className="h-7 w-7 rounded-xl bg-black text-white flex items-center justify-center font-extrabold text-xs">
                        {s.rank}
                      </div>
                      <div className="text-sm text-slate-700">Spot</div>
                    </div>
                    <div className="font-mono text-sm font-semibold">{s.score}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : null}

        {/* small status */}
        <div className="rounded-3xl border bg-white shadow-sm p-3">
          <div className="text-sm font-semibold">Status</div>
          <div className="mt-2 text-sm text-slate-700">
            {isPremiumFair ? (
              <span className="font-semibold text-emerald-700">≥ {PREMIUM_THRESHOLD} (Premium-fair)</span>
            ) : (
              <span className="text-slate-600">Below ≥ {PREMIUM_THRESHOLD}</span>
            )}
          </div>
        </div>
      </aside>
    </div>
  );
}

function BalanceHero({ score }: { score: number }) {
  const hit = score >= 90;

  return (
    <div
      className={`rounded-3xl border shadow-sm p-4 text-white bg-gradient-to-br ${balanceTone(score)} ring-1 ${balanceRing(
        score
      )}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-xs/5 opacity-90">Balance</div>

          <div className="mt-1 text-4xl font-extrabold tracking-tight">
            {hit ? ">90" : score}
            <span className="ml-2 text-sm font-semibold opacity-90">/ 100</span>
          </div>

          <div className="mt-1 text-xs opacity-90">{hit ? "Excellent ✅" : "Higher = more even"}</div>
        </div>

        <div className="shrink-0 rounded-2xl bg-white/15 px-3 py-2 text-center">
          <div className="text-[10px] uppercase tracking-wider opacity-90">Premium</div>
          <div className="text-lg font-extrabold">{hit ? "Excellent" : "—"}</div>
        </div>
      </div>
    </div>
  );
}