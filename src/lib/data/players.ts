import type { TypedSupabaseClient } from "@/lib/supabase/client";
import type { PlayerInsertRow, PlayerRow, PlayerUpdate } from "@/types/database";
import { unwrap, unwrapRequired } from "./errors";

export async function fetchPlayers(supabase: TypedSupabaseClient, teamId: string): Promise<PlayerRow[]> {
  const result = await supabase
    .from("players")
    .select("*")
    .eq("team_id", teamId)
    .order("last_name", { ascending: true })
    .order("first_name", { ascending: true });
  return unwrap(result) ?? [];
}

export async function insertPlayer(supabase: TypedSupabaseClient, values: PlayerInsertRow): Promise<PlayerRow> {
  return unwrapRequired(await supabase.from("players").insert(values).select("*").single());
}

export async function updatePlayer(
  supabase: TypedSupabaseClient,
  playerId: string,
  values: PlayerUpdate,
): Promise<PlayerRow> {
  return unwrapRequired(await supabase.from("players").update(values).eq("id", playerId).select("*").single());
}

export async function deletePlayer(supabase: TypedSupabaseClient, playerId: string): Promise<void> {
  const result = await supabase.from("players").delete().eq("id", playerId).select("id");
  const rows = unwrap(result);
  if (!rows || rows.length === 0) {
    // RLS liefert bei fehlender Berechtigung keine Zeile zurück statt eines Fehlers.
    throw Object.assign(new Error("forbidden"), { code: "42501" });
  }
}
