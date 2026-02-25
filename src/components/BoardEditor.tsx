"use client";

import React from "react";
import { AdGate } from "@/components/AdGate";
import { balanceScore, bestStartSpots, randomizeBoard } from "@/lib/catan/scoring";
import { isRed, pipValue } from "@/lib/catan/pips";
import { NUMBER_COUNTS, NUMBER_LIST, PlayerCount, Resource, RESOURCE_COUNTS, Tile } from "@/lib/catan/types";

const CANVAS_W = 920;
const CANVAS_H = 620;

function resIcon(res: Resource | null) {
  switch (res) {
    case "wood":
    case "holz":
      return "🌲";
    case "brick":
    case "lehm":
      return "🧱";
    case "sheep":
    case "schaf":
      return "🐑";
    case "wheat":
    case "getreide":
      return "🌾";
    case "ore":
    case "stein":
      return "⛰️";
    case "desert":
    case "wueste":
      return "🏜️";
    default:
      return "⬡";
  }
}

// keep your current resource ids; just make colors punchier
function resColor(res: Resource | null) {
  switch (res) {
    case "holz":
      return "#16a34a"; // greener
    case "lehm":
      return "#f97316"; // vivid orange
    case "schaf":
      return "#84cc16"; // bright lime
    case "getreide":
      return "#facc15"; // brighter yellow
    case "stein":
      return "#e5e7eb"; // light gray
    case "wueste":
      return "#fdba74"; // sand
    default:
      return "#ffffff";
  }
}

function balanceBadge(score: number) {
  if (score >= 90) return { label: ">90", sub: "Excellent", cls: "bg-emerald-600" };
  if (score >= 80) return { label: String(score), sub: "Great", cls: "bg-lime-600" };
  if (score >= 65) return { label: String(score), sub: "Good", cls: "bg-amber-500" };
  if (score >= 50) return { label: String(score), sub: "Okay", cls: "bg-orange-500" };
  return { label: String(score), sub: "Low", cls: "bg-red-600" };
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
  for (const t of tiles) {
    if (t.res) resLeft[t.res] = Math.max(0, (resLeft[t.res] ?? 0) - 1);
  }

  const numLeft: Record<number, number> = { ...NUMBER_COUNTS };
  for (const t of tiles) {
    if (t.num != null) numLeft[t.num] = Math.max(0, (numLeft[t.num] ?? 0) - 1);
  }

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

export default function BoardEditor({
  tiles,
  onChange,
}: {
  tiles: Tile[];
  onChange: (tiles: Tile[]) => void;
}) {
  const size = 58;
  const padding = 90;

  const [playerCount, setPlayerCount] = React.useState<PlayerCount>(4);
  const [showMarkers, setShowMarkers] = React.useState(true);

  const [brush, setBrush] = React.useState<Resource | "erase" | null>("holz");

  const [selected, setSelected] = React.useState<{ q: number; r: number } | null>(null);
  const [selectedCenter, setSelectedCenter] = React.useState<{ cx: number; cy: number } | null>(null);

  // responsive board sizing that prevents “off-screen drift”
  const hostRef = React.useRef<HTMLDivElement | null>(null);
  const [scale, setScale] = React.useState(1);

  React.useEffect(() => {
    function recompute() {
      const el = hostRef.current;
      if (!el) return;

      // Use available width; on mobile we also limit height to avoid huge whitespace.
      const w = el.clientWidth;
      const h = Math.max(280, Math.min(520, window.innerHeight * 0.55)); // mobile-friendly

      const s = Math.min(w / CANVAS_W, h / CANVAS_H);
      const clamped = Math.max(0.55, Math.min(1, s));
      setScale(clamped);
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

  const canEditNumber = !!selectedTile && selectedTile.res !== null && selectedTile.res !== "wueste";

  const metrics = React.useMemo(() => balanceScore(tiles), [tiles]);
  const badge = React.useMemo(() => balanceBadge(metrics.score), [metrics.score]);

  const startSpots = React.useMemo(() => bestStartSpots(tiles, playerCount), [tiles, playerCount]);

  function applyBrushToTile(q: number, r: number) {
    const idx = tiles.findIndex((t) => t.q === q && t.r === r);
    if (idx < 0) return;

    const next = tiles.map((t) => ({ ...t }));
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
    const idx = tiles.findIndex((t) => t.q === q && t.r === r);
    if (idx < 0) return;

    const next = tiles.map((t) => ({ ...t }));
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

  function resetBoard() {
    onChange(makeDefaultTiles());
    setSelected(null);
    setSelectedCenter(null);
    setBrush("holz");
  }

  function randomize() {
    onChange(randomizeBoard(tiles));
    setSelected(null);
    setSelectedCenter(null);
  }

  // Ad-gated actions
  const [pendingAction, setPendingAction] = React.useState<null | (() => void)>(null);
  function runWithAd(action: () => void) {
    setPendingAction(() => action);
    window.dispatchEvent(new CustomEvent("adgate:start"));
  }

  return (
    <div className="w-full">
      {/* Ad gate modal */}
      <AdGate
        seconds={5}
        title="Sponsored"
        description="Thanks — this keeps the app free."
        onDone={() => {
          const act = pendingAction;
          setPendingAction(null);
          act?.();
        }}
      />

      {/* MOBILE-FIRST STACK (top controls, then board, then stats) */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-3">
        {/* LEFT */}
        <div className="space-y-3">
          {/* TOP CONTROLS (requested: Super Search / Players / Best-start markers at top) */}
          <div className="rounded-3xl border bg-white shadow-sm p-3">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="text-base font-semibold">Find Boards</div>
                <div className="text-xs text-slate-600">
                  Randomize boards and reveal best start spots on the map.
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={randomize}
                  className="rounded-2xl bg-black text-white px-5 py-3 text-base font-semibold shadow-md hover:shadow-lg transition w-full sm:w-auto"
                  type="button"
                >
                  🎲 Randomize
                </button>
                <button
                  onClick={resetBoard}
                  className="rounded-2xl border bg-white px-4 py-3 text-sm font-semibold shadow-sm hover:shadow-md transition w-full sm:w-auto"
                  type="button"
                >
                  Reset
                </button>
              </div>
            </div>

            {/* Premium/Search bar row */}
            <div className="mt-3 grid grid-cols-1 sm:grid-cols-[auto_auto_1fr] gap-2 items-center">
              <div className="flex items-center justify-between sm:justify-start gap-2">
                <div className="text-sm font-semibold">Players</div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    className={`rounded-xl border px-3 py-2 text-sm ${
                      playerCount === 3 ? "bg-black text-white border-black" : "bg-white"
                    }`}
                    onClick={() => setPlayerCount(3)}
                  >
                    3
                  </button>
                  <button
                    type="button"
                    className={`rounded-xl border px-3 py-2 text-sm ${
                      playerCount === 4 ? "bg-black text-white border-black" : "bg-white"
                    }`}
                    onClick={() => setPlayerCount(4)}
                  >
                    4
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between sm:justify-start gap-2">
                <div className="text-sm font-semibold">Markers</div>
                <button
                  type="button"
                  className={`rounded-2xl px-4 py-2 text-sm font-semibold border shadow-sm ${
                    showMarkers ? "bg-black text-white border-black" : "bg-white"
                  }`}
                  onClick={() => setShowMarkers((v) => !v)}
                >
                  {showMarkers ? "On" : "Off"}
                </button>
              </div>

              <div className="flex flex-col sm:flex-row gap-2">
                <button
                  type="button"
                  className="rounded-2xl bg-black text-white px-4 py-3 text-sm font-semibold shadow-md hover:shadow-lg transition w-full"
                  onClick={() => runWithAd(() => {
                    // “Super search ≥ 90”: do repeated randomize attempts
                    // Keep it fast + capped to avoid freezing.
                    const MAX_TRIES = 250;
                    let best: Tile[] = tiles;
                    let bestScore = -1;

                    for (let i = 0; i < MAX_TRIES; i++) {
                      const candidate = randomizeBoard(tiles);
                      const s = balanceScore(candidate).score;
                      if (s > bestScore) {
                        best = candidate;
                        bestScore = s;
                      }
                      if (s >= 90) {
                        onChange(candidate);
                        return;
                      }
                    }

                    // fallback to best found
                    onChange(best);
                  })}
                >
                  Super Search (≥ 90)
                </button>

                <button
                  type="button"
                  className="rounded-2xl border bg-white px-4 py-3 text-sm font-semibold shadow-sm hover:shadow-md transition w-full"
                  onClick={() => runWithAd(() => setShowMarkers(true))}
                >
                  Show Best Start Spots
                </button>
              </div>
            </div>
          </div>

          {/* BRUSH */}
          <div className="rounded-3xl border bg-white shadow-sm p-3">
            <div className="flex items-center justify-between gap-2">
              <div className="text-sm font-semibold">Brush</div>
              <div className="text-xs text-slate-500">Tap hexes to paint · Tap again to set number</div>
            </div>

            <div className="mt-2 flex items-center gap-2 overflow-x-auto pb-1">
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
                    title={`${r} left: ${resLeft[r]}`}
                  >
                    <span
                      className="inline-flex items-center justify-center text-xl"
                      style={{
                        width: 34,
                        height: 34,
                        background: resColor(r),
                        clipPath: "polygon(25% 6.7%, 75% 6.7%, 100% 50%, 75% 93.3%, 25% 93.3%, 0% 50%)",
                      }}
                    >
                      {resIcon(r)}
                    </span>
                    <div className="text-left leading-tight">
                      <div className="text-sm font-semibold capitalize">{r}</div>
                      <div className={`text-xs ${active ? "text-white/70" : "text-slate-500"}`}>
                        {resLeft[r]} left
                      </div>
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
                title="Erase"
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
          </div>

          {/* BOARD (tight, centered, no overflow off right) */}
          <div
            data-board-wrap="1"
            ref={hostRef}
            className="relative rounded-3xl border bg-slate-100 shadow-sm p-2 sm:p-3 overflow-hidden"
          >
            <div className="w-full flex justify-center">
              <div
                className="relative"
                style={{
                  width: CANVAS_W,
                  height: CANVAS_H,
                  transform: `scale(${scale})`,
                  transformOrigin: "top center",
                }}
              >
                {/* Number popover */}
                {selected && selectedCenter && (
                  <div
                    data-popover="num"
                    className="absolute z-40 rounded-2xl border bg-white shadow-lg p-3"
                    style={{
                      left: selectedCenter.cx,
                      top: selectedCenter.cy,
                      transform: "translate(-50%, -120%)",
                      width: 340,
                      maxWidth: "90vw",
                    }}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="text-sm font-semibold">Pick Number</div>
                        <div className="text-xs text-slate-500">
                          {selectedTile ? (
                            <>
                              Tile <span className="font-mono font-semibold">{fieldLabel(selectedTile.q, selectedTile.r)}</span>{" "}
                              {selectedTile.res ? `· ${selectedTile.res}` : "· (empty)"}
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

                    {!canEditNumber && (
                      <div className="mt-2 text-xs text-amber-700">
                        Numbers only work on non-desert tiles with a resource set.
                      </div>
                    )}
                  </div>
                )}

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
                        clipPath: "polygon(25% 6.7%, 75% 6.7%, 100% 50%, 75% 93.3%, 25% 93.3%, 0% 50%)",
                        background: isSel ? "rgba(0,0,0,0.06)" : "transparent",
                        outline: isSel ? "3px solid #111" : "none",
                        borderRadius: 16,
                        cursor: "pointer",
                        touchAction: "manipulation",
                        zIndex: 20,
                      }}
                      onClick={(e) => {
                        e.stopPropagation();
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
                          {resIcon(t.res)}
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

                  {/* best start markers: only if enabled */}
                  {showMarkers
                    ? startSpots.map((v) => {
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
        </div>

        {/* RIGHT (on mobile this stays below board, less empty space) */}
        <aside className="space-y-3">
          {/* BALANCE highlight */}
          <div className="rounded-3xl border bg-white shadow-sm p-4">
            <div className="text-sm font-semibold">Balance</div>
            <div className="mt-3 flex items-center gap-4">
              <div className={`h-14 w-14 rounded-3xl ${badge.cls} flex flex-col items-center justify-center text-white font-extrabold`}>
                <div className="text-lg leading-none">{badge.label}</div>
                <div className="text-[11px] font-semibold opacity-90">{badge.sub}</div>
              </div>
              <div className="text-sm text-slate-600">
                Higher = more even.
                {metrics.score >= 90 ? (
                  <div className="mt-1 text-sm font-semibold text-emerald-700">Excellent board.</div>
                ) : null}
              </div>
            </div>
          </div>

          {/* Resource strength bars */}
          <div className="rounded-3xl border bg-white shadow-sm p-3">
            <div className="text-sm font-semibold">Resource Strength</div>
            <div className="mt-2 space-y-2">
              {(["holz", "lehm", "schaf", "getreide", "stein"] as Resource[]).map((r) => {
                const v = metrics.strengths[r];
                const max = Math.max(
                  1,
                  ...(["holz", "lehm", "schaf", "getreide", "stein"] as Resource[]).map((rr) => metrics.strengths[rr])
                );
                const pct = Math.round((v / max) * 100);
                return (
                  <div key={r} className="space-y-1">
                    <div className="flex items-center justify-between text-xs text-slate-600">
                      <span className="flex items-center gap-2">
                        <span className="inline-flex w-7 justify-center">{resIcon(r)}</span>
                        <span className="capitalize">{r}</span>
                      </span>
                      <span className="font-mono">{v}</span>
                    </div>
                    <div className="h-2 rounded-full bg-slate-200 overflow-hidden">
                      <div className="h-full" style={{ width: `${pct}%`, background: resColor(r) }} />
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="mt-2 text-xs text-slate-500">Strength = sum of pips across tiles.</div>
          </div>
        </aside>
      </div>
    </div>
  );
}