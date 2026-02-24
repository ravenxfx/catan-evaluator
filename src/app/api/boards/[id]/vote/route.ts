import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";

export async function POST(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const supabase = supabaseServer();

  // RPC versuchen
  try {
    const { error: rpcErr } = await supabase.rpc("increment_board_votes", { board_id: id });
    if (!rpcErr) return NextResponse.json({ ok: true, method: "rpc" });
  } catch {}

  // Fallback: select + update
  const { data: row, error: selErr } = await supabase.from("boards").select("votes").eq("id", id).single();
  if (selErr) return NextResponse.json({ ok: false, error: selErr.message }, { status: 500 });

  const nextVotes = (row?.votes ?? 0) + 1;
  const { error: updErr } = await supabase.from("boards").update({ votes: nextVotes }).eq("id", id);
  if (updErr) return NextResponse.json({ ok: false, error: updErr.message }, { status: 500 });

  return NextResponse.json({ ok: true, method: "fallback", votes: nextVotes });
}