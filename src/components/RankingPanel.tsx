"use client";

import React from "react";
import type { Tile } from "@/lib/catan/types";

type BoardRow = {
  id: string;
  score?: number; // balance score
  votes?: number;
  created_at?: string;
  title?: string | null;
};

function timeAgo(iso?: string) {
  if (!iso) return "";
  const d = new Date(iso);
  const diff = Date.now() - d.getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "gerade eben";
  if (m < 60) return `vor ${m} min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `vor ${h} h`;
  const days = Math.floor(h / 24);
  return `vor ${days} d`;
}

function getVoterKey() {
  if (typeof window === "undefined") return "server";
  const k = "catan_voter_key";
  let v = localStorage.getItem(k);
  if (!v) {
    v = crypto?.randomUUID?.() ?? `${Math.random()}-${Date.now()}`;
    localStorage.setItem(k, v);
  }
  return v;
}

export default function RankingPanel({
  onLoadBoard,
  refreshSignal,
}: {
  onLoadBoard: (tiles: Tile[]) => void;
  refreshSignal: number;
}) {
  const [sort, setSort] = React.useState<"score" | "votes" | "new">("score");
  const [rows, setRows] = React.useState<BoardRow[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [err, setErr] = React.useState<string | null>(null);

  async function fetchBoards() {
    setLoading(true);
    setErr(null);
    try {
      const qs = new URLSearchParams();
      qs.set("sort", sort);
      qs.set("limit", "30");
      const res = await fetch(`/api/boards?${qs.toString()}`, { cache: "no-store" });
      if (!res.ok) throw new Error(`GET /api/boards failed (${res.status})`);
      const data = await res.json();

      // accept either {boards:[...]} or [...]
      const list: BoardRow[] = Array.isArray(data) ? data : data?.boards ?? [];
      setRows(list);
    } catch (e: any) {
      setErr(e?.message ?? "Fehler beim Laden");
    } finally {
      setLoading(false);
    }
  }

  React.useEffect(() => {
    fetchBoards();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sort, refreshSignal]);

  async function loadBoard(id: string) {
    try {
      const res = await fetch(`/api/boards/${id}`, { cache: "no-store" });
      if (!res.ok) throw new Error(`GET /api/boards/${id} failed (${res.status})`);
      const data = await res.json();
      const tiles: Tile[] = data?.tiles ?? data?.board?.tiles ?? [];
      if (!Array.isArray(tiles) || tiles.length === 0) throw new Error("Board enthält keine Tiles");
      onLoadBoard(tiles);
    } catch (e: any) {
      alert(e?.message ?? "Board konnte nicht geladen werden");
    }
  }

  async function vote(id: string) {
    try {
      const voter_key = getVoterKey();
      const res = await fetch(`/api/boards/${id}/vote`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ voter_key }),
      });
      if (!res.ok) throw new Error(`vote failed (${res.status})`);

      // optimistic UI
      setRows((prev) =>
        prev.map((r) => (r.id === id ? { ...r, votes: (r.votes ?? 0) + 1 } : r))
      );
    } catch (e: any) {
      alert(e?.message ?? "Vote fehlgeschlagen");
    }
  }

  return (
    <div className="rounded-3xl border bg-white shadow-sm p-3">
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <div className="text-sm font-semibold">Ranking</div>
          <div className="text-xs text-slate-500">Boards aus Supabase</div>
        </div>

        <button
          type="button"
          onClick={fetchBoards}
          className="rounded-xl border bg-white px-3 py-2 text-xs shadow-sm hover:shadow-md transition"
        >
          Refresh
        </button>
      </div>

      <div className="mt-2 flex gap-2">
        {(
          [
            ["score", "Best Balance"],
            ["votes", "Most Votes"],
            ["new", "Newest"],
          ] as const
        ).map(([k, label]) => (
          <button
            key={k}
            type="button"
            onClick={() => setSort(k)}
            className={`rounded-xl border px-3 py-2 text-xs transition ${
              sort === k ? "bg-black text-white border-black" : "bg-white hover:shadow-sm"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {err ? (
        <div className="mt-3 rounded-2xl border bg-red-50 px-3 py-2 text-sm text-red-700">
          {err}
        </div>
      ) : null}

      <div className="mt-3">
        {loading ? (
          <div className="text-sm text-slate-600">Lade…</div>
        ) : rows.length === 0 ? (
          <div className="text-sm text-slate-600">Noch keine Boards gespeichert.</div>
        ) : (
          <div className="space-y-2">
            {rows.slice(0, 12).map((r, i) => (
              <div
                key={r.id}
                className="rounded-2xl border bg-slate-50 px-3 py-2 flex items-center justify-between gap-3"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="inline-flex h-6 w-6 items-center justify-center rounded-lg bg-black text-white text-xs font-extrabold">
                      {i + 1}
                    </span>
                    <div className="text-sm font-semibold text-slate-800 truncate">
                      {r.title || `Board ${r.id.slice(0, 6)}`}
                    </div>
                  </div>

                  <div className="mt-1 flex items-center gap-3 text-xs text-slate-500">
                    <span className="font-mono">score {Math.round(r.score ?? 0)}</span>
                    <span className="font-mono">votes {r.votes ?? 0}</span>
                    <span>{timeAgo(r.created_at)}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => loadBoard(r.id)}
                    className="rounded-xl border bg-white px-3 py-2 text-xs shadow-sm hover:shadow-md transition"
                  >
                    Load
                  </button>
                  <button
                    type="button"
                    onClick={() => vote(r.id)}
                    className="rounded-xl border bg-white px-3 py-2 text-xs shadow-sm hover:shadow-md transition"
                    title="Vote"
                  >
                    👍
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="mt-2 text-[11px] text-slate-500">
        Tipp: “Load” lädt das Board in deinen Editor. “👍” erhöht Votes.
      </div>
    </div>
  );
}