"use client";

import React from "react";
import { AdGate } from "@/components/AdGate";
import { AdSenseSlot } from "@/components/AdSenseSlot";
import { balanceScore, bestStartSpots, randomizeBoard } from "@/lib/catan/scoring";
import { isRed, pipValue } from "@/lib/catan/pips";
import { NUMBER_COUNTS, NUMBER_LIST, PlayerCount, Resource, RESOURCE_COUNTS, Tile } from "@/lib/catan/types";

const CANVAS_W = 920;
const CANVAS_H = 620;

// Put your AdSense slot ids here
const SLOT_BOTTOM_BANNER = "0000000000";
const SLOT_GATE_AI_SEARCH = "0000000000";
const SLOT_GATE_START_MARKERS = "0000000000";

function resLabel(res: Resource) {
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
  }
}

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
      return "#16a34a";
    case "lehm":
      return "#ea580c";
    case "schaf":
      return "#65a30d";
    case "getreide":
      return "#d97706";
    case "stein":
      return "#e5e7eb";
    case "wueste":
      return "#fb923c";
    default:
      return "#ffffff";
  }
}

function balanceColor(score: number) {
  if (score >= 90) return "bg-emerald-600";
  if (score >= 80) return "bg-lime-600";
  if (score >= 65) return "bg-amber-500";
  if (score >= 50) return "bg-orange-500";
  return "bg-red-600";
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

function prettyBalance(score: number) {
  if (score >= 90) return { text: ">90", tag: "Excellent" };
  return { text: String(score), tag: "Balance" };
}

export default function BoardEditor({
  tiles,
  onChange,
  mode = "builder",
  playerCount,
  onPlayerCountChange,
}: {
  tiles: Tile[];
  onChange: (tiles: Tile[]) => void;
  mode?: "builder" | "find";
  playerCount?: PlayerCount;
  onPlayerCountChange?: (v: PlayerCount) => void;
}) {
  // Board geometry
  const size = 58;
  const padding = 90;

  // Player count (controlled or local)
  const [playerCountLocal, setPlayerCountLocal] = React.useState<PlayerCount>(4);
  const effectivePlayerCount: PlayerCount = (playerCount ?? playerCountLocal) as PlayerCount;

  const setPlayerCountSafe = (v: PlayerCount) => {
    onPlayerCountChange?.(v);
    if (!onPlayerCountChange) setPlayerCountLocal(v);
  };

  // Markers
  const [markersOn, setMarkersOn] = React.useState(false);

  // Brush selection (builder only)
  const [brush, setBrush] = React.useState<Resource | "erase" | null>("holz");

  // Number popover
  const [selected, setSelected] = React.useState<{ q: number; r: number } | null>(null);
  const [selectedCenter, setSelectedCenter] = React.useState<{ cx: number; cy: number } | null>(null);

  // --- Mobile overflow FIX:
  // We center the board using left:50% translateX(-50%) and scale based on container width.
  const hostRef = React.useRef<HTMLDivElement | null>(null);
  const [scale, setScale] = React.useState(1);

  React.useEffect(() => {
    function recompute() {
      const el = hostRef.current;
      if (!el) return;

      // available width inside the board card
      const w = el.clientWidth;
      // give a little breathing room so it never touches right edge
      const available = Math.max(280, w - 16);
      // allow it to be BIG on mobile, but never overflow
      const s = Math.min(1.15, available / CANVAS_W);

      // keep a sane minimum
      setScale(Math.max(0.5, Number.isFinite(s) ? s : 1));
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
  const startSpots = React.useMemo(
    () => bestStartSpots(tiles, effectivePlayerCount),
    [tiles, effectivePlayerCount]
  );

  // Ad gate actions
  const [gate, setGate] = React.useState<null | { action: "aiSearch" | "showMarkers" }>(null);

  function runAfterAd(action: "aiSearch" | "showMarkers") {
    setGate({ action });
  }

  function finishGate() {
    const action = gate?.action;
    setGate(null);
    if (!action) return;

    if (action === "showMarkers") {
      setMarkersOn(true);
      return;
    }

    if (action === "aiSearch") {
      aiSuperSearch90();
      return;
    }
  }

  function resetBoard() {
    // keep existing tile coordinates; just clear all
    onChange(tiles.map((t) => ({ ...t, res: null, num: null })));
    setSelected(null);
    setSelectedCenter(null);
    setBrush("holz");
    setMarkersOn(false);
  }

  function generate() {
    onChange(randomizeBoard(tiles));
    setSelected(null);
    setSelectedCenter(null);
    setMarkersOn(false);
  }

  function aiSuperSearch90() {
    const max = 250;
    let best = tiles;
    let bestScore = balanceScore(tiles).score;

    for (let i = 0; i < max; i++) {
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
    onChange(best);
  }

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

  // close popover on outside click
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

  const balance = prettyBalance(metrics.score);

  const resourcesForBars: Resource[] = ["holz", "lehm", "schaf", "getreide", "stein"];
  const maxStrength = Math.max(1, ...resourcesForBars.map((r) => metrics.strengths[r]));

  return (
    <>
      {gate ? (
        <AdGate
          seconds={3}
          title="Sponsored"
          subtitle="Loading…"
          slot={gate.action === "aiSearch" ? SLOT_GATE_AI_SEARCH : SLOT_GATE_START_MARKERS}
          onDone={finishGate}
        />
      ) : null}

      {/* Mobile-first: compact header/options, big board, metrics below. Desktop: two columns. */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-3">
        {/* LEFT */}
        <div className="space-y-3">
          {/* Top panel */}
          <div className="rounded-3xl border bg-white shadow-sm p-3 sm:p-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="min-w-0">
                <div className="text-base sm:text-lg font-semibold text-slate-900">
                  {mode === "find" ? "Find Fair Boards" : "Evaluate Your Board"}
                </div>
                <div className="text-sm text-slate-700">
                  {mode === "find"
                    ? "Generate fairer Catan boards for your game, check balance, and reveal the best starting positions on the map."
                    : "Paint resources and set numbers to test balance and reveal best starting positions on the map."}
                </div>
              </div>

              {/* Main actions (smaller header, big primary button) */}
              <div className="flex items-center gap-2">
                <button
                  onClick={generate}
                  className="rounded-2xl bg-black text-white px-5 py-3 text-base font-semibold shadow-sm hover:shadow-md transition flex items-center gap-2"
                  type="button"
                >
                  🎲 Generate
                </button>
                <button
                  onClick={resetBoard}
                  className="rounded-2xl border bg-white px-4 py-3 text-base text-slate-900 shadow-sm hover:shadow-md transition"
                  type="button"
                >
                  Reset
                </button>
              </div>
            </div>

            {/* Options bar (compact on mobile) */}
            <div className="mt-3 rounded-3xl border bg-slate-50 p-3">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div className="text-sm font-semibold text-slate-900">Options</div>

                <div className="flex items-center gap-2">
                  <div className="text-xs font-medium text-slate-700">Players</div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      className={`rounded-xl border px-3 py-2 text-sm ${
                        effectivePlayerCount === 3 ? "bg-black text-white border-black" : "bg-white text-slate-900"
                      }`}
                      onClick={() => setPlayerCountSafe(3)}
                    >
                      3
                    </button>
                    <button
                      type="button"
                      className={`rounded-xl border px-3 py-2 text-sm ${
                        effectivePlayerCount === 4 ? "bg-black text-white border-black" : "bg-white text-slate-900"
                      }`}
                      onClick={() => setPlayerCountSafe(4)}
                    >
                      4
                    </button>
                  </div>
                </div>
              </div>

              {mode === "find" ? (
                <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <button
                    type="button"
                    className="rounded-2xl bg-black text-white py-3 font-semibold shadow-sm hover:shadow-md transition"
                    onClick={() => runAfterAd("aiSearch")}
                  >
                    AI Super Search (≥ 90)
                  </button>

                  <button
                    type="button"
                    className="rounded-2xl border py-3 font-semibold shadow-sm hover:shadow-md transition bg-white text-slate-900"
                    onClick={() => runAfterAd("showMarkers")}
                  >
                    Best Starting Positions
                  </button>
                </div>
              ) : null}

              <div className="mt-2 text-xs text-slate-600">
                Buttons may show an ad before running the feature.
              </div>
            </div>
          </div>

          {/* Brush (builder only) */}
          {mode === "builder" ? (
            <div className="rounded-3xl border bg-white shadow-sm p-3">
              <div className="flex items-center justify-between gap-2">
                <div className="text-sm font-semibold text-slate-900">Brush</div>
                <div className="text-xs text-slate-700">Tap hex to paint • Tap again to pick number</div>
              </div>

              <div className="mt-3 flex items-center gap-2 overflow-x-auto pb-1">
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
                        active ? "bg-black text-white border-black" : "bg-white hover:shadow-md text-slate-900"
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
                        {resIcon(r)}
                      </span>
                      <div className="text-left leading-tight">
                        <div className="text-sm font-semibold">{resLabel(r)}</div>
                        <div className={`text-xs ${active ? "text-white/70" : "text-slate-700"}`}>
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
                    brush === "erase" ? "bg-black text-white border-black" : "bg-white hover:shadow-md text-slate-900"
                  }`}
                  title="Erase (clear res+num)"
                >
                  <span className="inline-flex items-center justify-center text-xl" style={{ width: 34, height: 34 }}>
                    🧽
                  </span>
                  <div className="text-left leading-tight">
                    <div className="text-sm font-semibold">Erase</div>
                    <div className={`text-xs ${brush === "erase" ? "text-white/70" : "text-slate-700"}`}>clear</div>
                  </div>
                </button>
              </div>
            </div>
          ) : null}

          {/* Board (mobile overflow fixed) */}
          <div
            data-board-wrap="1"
            ref={hostRef}
            className="relative rounded-3xl border bg-slate-100 shadow-sm p-2 sm:p-3 overflow-hidden"
          >
            <div
              className="relative"
              style={{
                width: CANVAS_W,
                height: CANVAS_H,
                left: "50%",
                transform: `translateX(-50%) scale(${scale})`,
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
                    width: Math.min(340, CANVAS_W - 20),
                  }}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-sm font-semibold text-slate-900">Choose number</div>
                      <div className="text-xs text-slate-700">
                        {selectedTile ? (
                          <>
                            Tile{" "}
                            <span className="font-mono font-semibold">
                              {fieldLabel(selectedTile.q, selectedTile.r)}
                            </span>{" "}
                            {selectedTile.res ? `· ${resLabel(selectedTile.res)}` : "· (empty)"}
                          </>
                        ) : (
                          "No tile"
                        )}
                      </div>
                    </div>
                    <button
                      className="text-xs rounded-lg border px-2 py-1 text-slate-900"
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
                        canEditNumber ? "bg-white hover:bg-slate-50 text-slate-900" : "opacity-40 cursor-not-allowed"
                      }`}
                      type="button"
                      disabled={!canEditNumber}
                      onClick={() => {
                        if (!selectedTile) return;
                        setNumber(selectedTile.q, selectedTile.r, null);
                      }}
                    >
                      clear
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
                          } ${isRed(n) ? "text-red-600 font-semibold" : "text-slate-900"} ${
                            isCurrent ? "bg-black text-white hover:bg-black" : ""
                          }`}
                          type="button"
                          onClick={() => {
                            if (!selectedTile) return;
                            setNumber(selectedTile.q, selectedTile.r, n);
                          }}
                        >
                          {n}
                          <span className="ml-2 text-xs text-slate-500">{isCurrent ? "" : `×${stock}`}</span>
                        </button>
                      );
                    })}
                  </div>

                  {!canEditNumber && (
                    <div className="mt-2 text-xs text-amber-700">
                      Numbers can only be set on non-desert resource tiles.
                    </div>
                  )}
                </div>
              )}

              {/* Hit areas */}
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
                      background: isSel ? "rgba(0,0,0,0.06)" : "transparent",
                      outline: isSel ? "3px solid #111" : "none",
                      borderRadius: 16,
                      cursor: "pointer",
                      touchAction: "manipulation",
                      zIndex: 20,
                    }}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (mode === "builder") applyBrushToTile(t.q, t.r);
                      setSelected({ q: t.q, r: t.r });
                      setSelectedCenter({ cx, cy });
                    }}
                  />
                );
              })}

              {/* SVG */}
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

                      <text x={cx} y={cy - 26} textAnchor="middle" fontSize="11" fill="#0f172a">
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
                        fill={isRed(t.num) ? "#dc2626" : "#0f172a"}
                        fontWeight={isRed(t.num) ? "800" : "700"}
                      >
                        {t.num ?? ""}
                      </text>

                      {t.num != null && t.res && t.res !== "wueste" ? (
                        <text x={cx} y={cy + 46} textAnchor="middle" fontSize="10" fill="#334155">
                          pips {pipValue(t.num)}
                        </text>
                      ) : null}
                    </g>
                  );
                })}

                {markersOn
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

        {/* RIGHT (on mobile becomes BELOW board) */}
        <aside className="space-y-3">
          {/* Balance */}
          <div className="rounded-3xl border bg-white shadow-sm p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-sm font-semibold text-slate-900">Balance</div>
                <div className="text-xs text-slate-700">Higher = more even</div>
              </div>

              <div className={`h-14 w-20 rounded-2xl ${balanceColor(metrics.score)} flex flex-col items-center justify-center text-white`}>
                <div className="text-2xl font-extrabold leading-none">{balance.text}</div>
                <div className="text-[11px] font-semibold opacity-90">{balance.tag}</div>
              </div>
            </div>

            <div className="mt-3 text-xs text-slate-700">
              If balance is ≥ 90, we show <span className="font-semibold">&gt;90 • Excellent</span>.
            </div>
          </div>

          {/* Strength bars */}
          <div className="rounded-3xl border bg-white shadow-sm p-4">
            <div className="text-sm font-semibold text-slate-900">Resource Strength</div>
            <div className="mt-3 space-y-2">
              {resourcesForBars.map((r) => {
                const v = metrics.strengths[r] ?? 0;
                const pct = Math.round((v / maxStrength) * 100);
                return (
                  <div key={r} className="space-y-1">
                    <div className="flex items-center justify-between text-xs text-slate-700">
                      <span className="flex items-center gap-2">
                        <span className="inline-flex w-7 justify-center">{resIcon(r)}</span>
                        <span>{resLabel(r)}</span>
                      </span>
                      <span className="font-mono text-slate-900 font-semibold">{v}</span>
                    </div>
                    <div className="h-2 rounded-full bg-slate-200 overflow-hidden">
                      <div className="h-full" style={{ width: `${pct}%`, background: resColor(r) }} />
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="mt-2 text-xs text-slate-700">
              Strength = sum of pips (6/8=5 … 2/12=1) across all tiles of that resource.
            </div>
          </div>

          {/* Ad at bottom under scores (mobile requirement) */}
          <div className="rounded-3xl border bg-white shadow-sm p-4">
            <div className="text-xs text-slate-500 mb-2">Advertisement</div>
            <AdSenseSlot slot={SLOT_BOTTOM_BANNER} className="min-h-[120px]" />
          </div>
        </aside>
      </div>
    </>
  );
}