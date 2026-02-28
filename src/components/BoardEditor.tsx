"use client";

import React from "react";
import { balanceScore, bestStartSpots, randomizeBoard } from "@/lib/catan/scoring";
import { isRed, pipValue } from "@/lib/catan/pips";
import { NUMBER_COUNTS, NUMBER_LIST, PlayerCount, Resource, RESOURCE_COUNTS, Tile } from "@/lib/catan/types";

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

function prettyBalance(score: number) {
  if (score >= 90) return { text: ">90", tag: "Excellent" };
  return { text: String(score), tag: "Balance" };
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

function axialToPixel(q: number, r: number, size: number) {
  // pointy top axial
  const x = size * Math.sqrt(3) * (q + r / 2);
  const y = size * (3 / 2) * r;
  return { x, y };
}

function hexPoints(cx: number, cy: number, size: number) {
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
  const size = 58;

  const [playerCountLocal, setPlayerCountLocal] = React.useState<PlayerCount>(4);
  const effectivePlayerCount: PlayerCount = (playerCount ?? playerCountLocal) as PlayerCount;

  const setPlayerCountSafe = (v: PlayerCount) => {
    onPlayerCountChange?.(v);
    if (!onPlayerCountChange) setPlayerCountLocal(v);
  };

  const [markersOn, setMarkersOn] = React.useState(false);
  const [brush, setBrush] = React.useState<Resource | "erase" | null>(mode === "find" ? null : "holz");
  const [selected, setSelected] = React.useState<{ q: number; r: number } | null>(null);

  React.useEffect(() => {
    // mode switch convenience
    setBrush(mode === "find" ? null : "holz");
    setSelected(null);
    setMarkersOn(false);
  }, [mode]);

  const { resLeft, numLeft } = React.useMemo(() => createPoolsFromTiles(tiles), [tiles]);

  // Precompute centers and tight bounds (THIS removes whitespace & prevents overflow)
  const layout = React.useMemo(() => {
    const pad = 14; // tight padding so score comes sooner
    const centers = tiles.map((t) => {
      const p = axialToPixel(t.q, t.r, size);
      return { ...t, cx: p.x, cy: p.y };
    });

    let minX = Infinity,
      minY = Infinity,
      maxX = -Infinity,
      maxY = -Infinity;

    const r = size * 1.05;
    for (const c of centers) {
      minX = Math.min(minX, c.cx - r);
      maxX = Math.max(maxX, c.cx + r);
      minY = Math.min(minY, c.cy - r);
      maxY = Math.max(maxY, c.cy + r);
    }

    const W = maxX - minX + pad * 2;
    const H = maxY - minY + pad * 2;

    // translate so everything is positive inside viewBox
    const tx = -minX + pad;
    const ty = -minY + pad;

    return { centers, W, H, tx, ty };
  }, [tiles, size]);

  const selectedTile = React.useMemo(() => {
    if (!selected) return null;
    return tiles.find((t) => t.q === selected.q && t.r === selected.r) ?? null;
  }, [selected, tiles]);

  const canEditNumber = !!selectedTile && selectedTile.res !== null && selectedTile.res !== "wueste";

  const metrics = React.useMemo(() => balanceScore(tiles), [tiles]);
  const startSpots = React.useMemo(() => bestStartSpots(tiles, effectivePlayerCount), [tiles, effectivePlayerCount]);

  function resetBoard() {
    onChange(makeDefaultTiles());
    setSelected(null);
    setMarkersOn(false);
    if (mode === "builder") setBrush("holz");
  }

  function generate() {
    onChange(randomizeBoard(tiles));
    setSelected(null);
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
        setMarkersOn(true);
        return;
      }
    }
    onChange(best);
    setMarkersOn(true);
  }

  function applyBrush(q: number, r: number) {
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

  const balance = prettyBalance(metrics.score);

  return (
    <div className="space-y-3">
      {/* Top controls */}
      <div className="rounded-3xl border bg-white shadow-sm p-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="text-sm font-semibold text-slate-900">
              {mode === "find" ? "Find Fair Catan Boards" : "Evaluate Your Board"}
            </div>
            <div className="mt-1 text-xs text-slate-700">
              {mode === "find"
                ? "Generate fairer Settlers of Catan boards and reveal the best starting positions directly on the map."
                : "Paint resources and set numbers to test balance, then reveal best starting positions on the map."}
            </div>
          </div>

          {/* ✅ Generate + Reset side by side on mobile */}
          <div className="flex flex-nowrap gap-2 shrink-0">
            <button
              onClick={generate}
              className="rounded-2xl bg-slate-900 text-white px-4 py-2 text-sm font-semibold shadow-sm hover:shadow-md transition whitespace-nowrap"
              type="button"
            >
              🎲 Generate
            </button>
            <button
              onClick={resetBoard}
              className="rounded-2xl border bg-white px-4 py-2 text-sm font-semibold text-slate-900 shadow-sm hover:shadow-md transition whitespace-nowrap"
              type="button"
            >
              Reset
            </button>
          </div>
        </div>

        {mode === "find" ? (
          <div className="mt-3 rounded-3xl border bg-slate-50 p-3">
            <div className="flex items-center justify-between gap-2">
              <div className="text-xs font-semibold text-slate-900">Options</div>

              <div className="flex items-center gap-2">
                <div className="text-xs text-slate-800">Players</div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    className={`rounded-xl border px-3 py-2 text-sm font-semibold ${
                      effectivePlayerCount === 3 ? "bg-slate-900 text-white border-slate-900" : "bg-white text-slate-900"
                    }`}
                    onClick={() => setPlayerCountSafe(3)}
                  >
                    3
                  </button>
                  <button
                    type="button"
                    className={`rounded-xl border px-3 py-2 text-sm font-semibold ${
                      effectivePlayerCount === 4 ? "bg-slate-900 text-white border-slate-900" : "bg-white text-slate-900"
                    }`}
                    onClick={() => setPlayerCountSafe(4)}
                  >
                    4
                  </button>
                </div>
              </div>
            </div>

            <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
              <button
                type="button"
                className="rounded-2xl bg-slate-900 text-white py-3 text-sm font-semibold shadow-sm hover:shadow-md transition"
                onClick={aiSuperSearch90}
              >
                AI Super Search (≥ 90)
              </button>

              <button
                type="button"
                className="rounded-2xl border py-3 text-sm font-semibold shadow-sm hover:shadow-md transition bg-white text-slate-900"
                onClick={() => setMarkersOn((v) => !v)}
              >
                Best Starting Positions
              </button>
            </div>
          </div>
        ) : null}

        {mode === "builder" ? (
          <div className="mt-3 rounded-3xl border bg-slate-50 p-3">
            <div className="flex items-center justify-between gap-2">
              <div className="text-xs font-semibold text-slate-900">Brush</div>
              <div className="text-xs text-slate-700">Tap hex to paint • Select tile below to set number</div>
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
                      active ? "bg-slate-900 text-white border-slate-900" : "bg-white hover:shadow-md"
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
                      <div className={`text-xs ${active ? "text-white/80" : "text-slate-700"}`}>{resLeft[r]} left</div>
                    </div>
                  </button>
                );
              })}

              <button
                type="button"
                onClick={() => setBrush("erase")}
                className={`shrink-0 rounded-2xl border px-3 py-2 flex items-center gap-2 shadow-sm transition ${
                  brush === "erase" ? "bg-slate-900 text-white border-slate-900" : "bg-white hover:shadow-md"
                }`}
                title="Erase (clear res+num)"
              >
                <span className="inline-flex items-center justify-center text-xl" style={{ width: 34, height: 34 }}>
                  🧽
                </span>
                <div className="text-left leading-tight">
                  <div className="text-sm font-semibold">Erase</div>
                  <div className={`text-xs ${brush === "erase" ? "text-white/80" : "text-slate-700"}`}>clear</div>
                </div>
              </button>
            </div>
          </div>
        ) : null}
      </div>

      {/* ✅ BIG RESPONSIVE BOARD (NO fixed height, NO overflow, NO whitespace) */}
      <div className="rounded-3xl border bg-slate-100 shadow-sm p-2">
        <svg
          viewBox={`0 0 ${layout.W} ${layout.H}`}
          width="100%"
          style={{ display: "block", height: "auto" }}
          preserveAspectRatio="xMidYMid meet"
        >
          <g transform={`translate(${layout.tx}, ${layout.ty})`}>
            {layout.centers.map((t) => {
              const poly = hexPoints(t.cx, t.cy, size);
              const isSel = selected?.q === t.q && selected?.r === t.r;

              return (
                <g key={`${t.q},${t.r}`}>
                  {/* Clickable hex */}
                  <polygon
                    points={poly}
                    fill={resColor(t.res)}
                    stroke="#111827"
                    strokeWidth={1.2}
                    style={{ cursor: "pointer" }}
                    onClick={() => {
                      if (mode === "builder") applyBrush(t.q, t.r);
                      setSelected({ q: t.q, r: t.r });
                    }}
                  />

                  {/* selection outline */}
                  {isSel ? (
                    <polygon points={poly} fill="transparent" stroke="#0f172a" strokeWidth={3} />
                  ) : null}

                  <text x={t.cx} y={t.cy - 26} textAnchor="middle" fontSize="11" fill="#111827">
                    {fieldLabel(t.q, t.r)}
                  </text>

                  <text x={t.cx} y={t.cy - 4} textAnchor="middle" fontSize="22">
                    {resIcon(t.res)}
                  </text>

                  <circle cx={t.cx} cy={t.cy + 22} r={15} fill="#fff" stroke="#111827" strokeWidth={1} />
                  <text
                    x={t.cx}
                    y={t.cy + 26}
                    textAnchor="middle"
                    fontSize="12"
                    fill={isRed(t.num) ? "#dc2626" : "#111827"}
                    fontWeight={isRed(t.num) ? "800" : "700"}
                  >
                    {t.num ?? ""}
                  </text>

                  {t.num != null && t.res && t.res !== "wueste" ? (
                    <text x={t.cx} y={t.cy + 46} textAnchor="middle" fontSize="10" fill="#334155">
                      pips {pipValue(t.num)}
                    </text>
                  ) : null}
                </g>
              );
            })}

            {/* markers */}
            {markersOn
              ? startSpots.map((v) => (
                  <g key={`m-${v.id}`}>
                    <circle cx={v.x} cy={v.y} r={13} fill="#0f172a" opacity={0.92} />
                    <circle cx={v.x} cy={v.y} r={14} fill="transparent" stroke="#fff" strokeWidth={1.8} opacity={0.95} />
                    <text x={v.x} y={v.y + 4} textAnchor="middle" fontSize="11" fill="#fff" fontWeight={800}>
                      {v.rank}
                    </text>
                  </g>
                ))
              : null}
          </g>
        </svg>
      </div>

      {/* ✅ Number picker BELOW board (no floating popover, mobile-friendly) */}
      {mode === "builder" && selectedTile ? (
        <div className="rounded-3xl border bg-white shadow-sm p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-sm font-semibold text-slate-900">Numbers</div>
              <div className="text-xs text-slate-700">
                Tile <span className="font-mono font-semibold text-slate-900">{fieldLabel(selectedTile.q, selectedTile.r)}</span>{" "}
                {selectedTile.res ? `· ${resLabel(selectedTile.res)}` : "· (empty)"}
              </div>
            </div>
            <button
              type="button"
              className="rounded-xl border px-3 py-2 text-sm font-semibold text-slate-900"
              onClick={() => setSelected(null)}
            >
              Done
            </button>
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            <button
              className={`rounded-xl border px-3 py-2 text-sm font-semibold ${
                canEditNumber ? "bg-white hover:bg-slate-50 text-slate-900" : "opacity-40 cursor-not-allowed"
              }`}
              type="button"
              disabled={!canEditNumber}
              onClick={() => setNumber(selectedTile.q, selectedTile.r, null)}
            >
              clear
            </button>

            {NUMBER_LIST.map((n) => {
              const stock = numLeft[n] ?? 0;
              const isCurrent = selectedTile.num === n;
              const disabled = !canEditNumber || (!isCurrent && stock <= 0);

              return (
                <button
                  key={n}
                  disabled={disabled}
                  className={`rounded-xl border px-3 py-2 text-sm font-mono transition ${
                    disabled ? "opacity-40 cursor-not-allowed" : "bg-white hover:bg-slate-50 text-slate-900"
                  } ${isRed(n) ? "text-red-600 font-semibold" : ""} ${
                    isCurrent ? "bg-slate-900 text-white hover:bg-slate-900 border-slate-900" : ""
                  }`}
                  type="button"
                  onClick={() => setNumber(selectedTile.q, selectedTile.r, n)}
                >
                  {n}
                  <span className="ml-2 text-xs text-slate-500">{isCurrent ? "" : `×${stock}`}</span>
                </button>
              );
            })}
          </div>

          {!canEditNumber ? (
            <div className="mt-2 text-xs text-amber-700">Numbers can only be set on non-desert resource tiles.</div>
          ) : null}
        </div>
      ) : null}

      {/* Scores */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <div className="rounded-3xl border bg-white shadow-sm p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-sm font-semibold text-slate-900">Balance</div>
              <div className="text-xs text-slate-700">Higher = more even</div>
            </div>

            <div className={`h-14 w-20 rounded-2xl ${balanceColor(metrics.score)} flex flex-col items-center justify-center text-white`}>
              <div className="text-2xl font-extrabold leading-none">{prettyBalance(metrics.score).text}</div>
              <div className="text-[11px] font-semibold opacity-90">{prettyBalance(metrics.score).tag}</div>
            </div>
          </div>

          <div className="mt-3 text-xs text-slate-700">
            If balance is ≥ 90, we show <span className="font-semibold text-slate-900">&gt;90 • Excellent</span>.
          </div>
        </div>

        <div className="rounded-3xl border bg-white shadow-sm p-4">
          <div className="text-sm font-semibold text-slate-900">Resource Strength</div>
          <div className="mt-3 space-y-2">
            {(["holz", "lehm", "schaf", "getreide", "stein"] as Resource[]).map((r) => {
              const v = metrics.strengths[r] ?? 0;
              const max = Math.max(
                1,
                ...(["holz", "lehm", "schaf", "getreide", "stein"] as Resource[]).map((rr) => metrics.strengths[rr] ?? 0)
              );
              const pct = Math.round((v / max) * 100);
              return (
                <div key={r} className="space-y-1">
                  <div className="flex items-center justify-between text-xs text-slate-700">
                    <span className="flex items-center gap-2">
                      <span className="inline-flex w-7 justify-center">{resIcon(r)}</span>
                      <span className="text-slate-900">{resLabel(r)}</span>
                    </span>
                    <span className="font-mono text-slate-900">{v}</span>
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
      </div>
    </div>
  );
}