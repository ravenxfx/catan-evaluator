import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";

export async function GET(_: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;

  const supabase = supabaseServer();
  const { data, error } = await supabase
    .from("boards")
    .select("id, title, player_count, tiles, balance_score, resource_strength, votes, updated_at, created_at")
    .eq("id", id)
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 404 });
  return NextResponse.json({ board: data });
}