import type { TypedSupabaseClient } from "@/lib/supabase/client";
import type { Database } from "@/types/database";
import { unwrap, unwrapRequired } from "./errors";

export type PlayerNoteRow = Database["public"]["Tables"]["player_notes"]["Row"];

export interface PlayerNote extends PlayerNoteRow {
  authorName: string;
}

/** Neueste zuerst: nach Notiz-Datum, bei gleichem Datum nach Erfassungszeit. */
export function sortNotes<T extends Pick<PlayerNoteRow, "note_date" | "created_at">>(notes: T[]): T[] {
  return [...notes].sort((a, b) => b.note_date.localeCompare(a.note_date) || b.created_at.localeCompare(a.created_at));
}

async function withAuthorNames(supabase: TypedSupabaseClient, rows: PlayerNoteRow[]): Promise<PlayerNote[]> {
  const ids = Array.from(new Set(rows.map((r) => r.author_id).filter((id): id is string => Boolean(id))));
  const profiles = ids.length ? (unwrap(await supabase.from("profiles").select("id, display_name").in("id", ids)) ?? []) : [];
  const names = new Map(profiles.map((p) => [p.id, p.display_name]));
  return rows.map((r) => ({ ...r, authorName: (r.author_id && names.get(r.author_id)) || "Ehemaliges Mitglied" }));
}

export async function fetchPlayerNotes(supabase: TypedSupabaseClient, playerId: string): Promise<PlayerNote[]> {
  const rows =
    unwrap(
      await supabase
        .from("player_notes")
        .select("*")
        .eq("player_id", playerId)
        .order("note_date", { ascending: false })
        .order("created_at", { ascending: false }),
    ) ?? [];
  return withAuthorNames(supabase, rows);
}

export async function createPlayerNote(
  supabase: TypedSupabaseClient,
  values: { teamId: string; playerId: string; noteDate: string; body: string },
): Promise<PlayerNote> {
  const row = unwrapRequired<PlayerNoteRow>(
    await supabase
      .from("player_notes")
      .insert({ team_id: values.teamId, player_id: values.playerId, note_date: values.noteDate, body: values.body.trim() })
      .select("*")
      .single(),
  );
  return (await withAuthorNames(supabase, [row]))[0];
}

export async function updatePlayerNote(
  supabase: TypedSupabaseClient,
  noteId: string,
  values: { noteDate: string; body: string },
): Promise<PlayerNote> {
  const row = unwrapRequired<PlayerNoteRow>(
    await supabase
      .from("player_notes")
      .update({ note_date: values.noteDate, body: values.body.trim() })
      .eq("id", noteId)
      .select("*")
      .single(),
  );
  return (await withAuthorNames(supabase, [row]))[0];
}

export async function deletePlayerNote(supabase: TypedSupabaseClient, noteId: string): Promise<void> {
  const rows = unwrap(await supabase.from("player_notes").delete().eq("id", noteId).select("id"));
  if (!rows?.length) throw Object.assign(new Error("forbidden"), { code: "42501" });
}
