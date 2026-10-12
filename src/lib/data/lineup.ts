import type { TypedSupabaseClient } from "@/lib/supabase/client";
import { isFieldPositionCode } from "@/lib/domain/positions";
import type { LineupState, MoveCommand } from "@/lib/lineup/logic";
import type { LineupPositionRow } from "@/types/database";
import { unwrap } from "./errors";

export interface ActiveLineup {
  id: string;
  name: string;
}

export async function fetchActiveLineup(supabase: TypedSupabaseClient, teamId: string): Promise<ActiveLineup | null> {
  const result = await supabase
    .from("lineups")
    .select("id, name")
    .eq("team_id", teamId)
    .eq("is_active", true)
    .maybeSingle();
  return unwrap(result);
}

export async function fetchLineupState(supabase: TypedSupabaseClient, lineupId: string): Promise<LineupState> {
  const rows = unwrap(
    await supabase
      .from("lineup_positions")
      .select("*")
      .eq("lineup_id", lineupId)
      .order("sort_order", { ascending: true }),
  );
  return rowsToLineupState(rows ?? []);
}

export function rowsToLineupState(rows: Pick<LineupPositionRow, "player_id" | "position_code" | "sort_order">[]): LineupState {
  const state: LineupState = { field: {}, bench: [] };
  const bench = rows
    .filter((r) => r.position_code === "BANK")
    .sort((a, b) => a.sort_order - b.sort_order);
  for (const row of rows) {
    if (isFieldPositionCode(row.position_code)) state.field[row.position_code] = row.player_id;
  }
  state.bench = bench.map((r) => r.player_id);
  return state;
}

export async function movePlayer(supabase: TypedSupabaseClient, lineupId: string, command: MoveCommand): Promise<void> {
  const { error } = await supabase.rpc("move_player", {
    p_lineup: lineupId,
    p_player: command.playerId,
    p_target: command.target,
    p_bench_index: command.benchIndex ?? null,
    p_displaced: command.displaced ?? "bench",
  });
  if (error) throw error;
}
