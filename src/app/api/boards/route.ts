import { NextResponse } from "next/server";
import crypto from "crypto";
import { supabaseServer } from "@/lib/supabase/server";

type Tile = {
  q: number;
  r: number;
  label: string;
  res: string | null;
  num: number | null;
};

function stableHash(payload: unknown) {
  const json = JSON.stringify(payload);
  return crypto.createHash("sha256").update(json).digest("hex");
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const limit = Math.min(Number(searchParams.get("limit") ?? 20), 50);

  const supabase = supabaseServer();
  const { data, error } = await supabase
    .from("boards")
    .select("id, title, player_count, balance_score, votes, updated_at, created_at")
    .order("votes", { ascending: false })
    .order("updated_at", { ascending: false })
    .limit(limit);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ boards: data ?? [] });
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });

  const tiles = body.tiles as Tile[] | undefined;
  const player_count = (body.player_count as number) ?? 4;
  const balance_score = (body.balance_score as number) ?? 0;
  const resource_strength = (body.resource_strength as Record<string, number>) ?? {};
  const title = (body.title as string | undefined) ?? null;

  if (!Array.isArray(tiles) || tiles.length !== 19) {
    return NextResponse.json({ error: "tiles must be an array of length 19" }, { status: 400 });
  }

  // Dedup: same board state => same hash
  const hash = stableHash({ tiles, player_count });

  const supabase = supabaseServer();

  // If board with same hash exists, just return it (and optionally bump updated_at via update)
  const existing = await supabase.from("boards").select("id").eq("hash", hash).limit(1).maybeSingle();
  if (existing.data?.id) {
    return NextResponse.json({ id: existing.data.id, deduped: true });
  }

  const { data, error } = await supabase
    .from("boards")
    .insert({
      tiles,
      player_count,
      balance_score,
      resource_strength,
      title,
      hash,
    })
    .select("id")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ id: data.id, deduped: false });
}