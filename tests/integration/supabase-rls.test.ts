/**
 * Integrationstests gegen eine echte Supabase-Instanz (NIE gegen Produktion mit echten Spielerdaten).
 *
 * Benötigt in .env.test.local (wird nicht eingecheckt):
 *   SUPABASE_TEST_URL=…
 *   SUPABASE_TEST_PUBLISHABLE_KEY=…
 *   SUPABASE_TEST_SERVICE_ROLE_KEY=…   (nur hier für das Anlegen/Löschen von Testkonten)
 *
 * Ausführen: npm run test:integration
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Database } from "@/types/database";
import { fetchLineupState } from "@/lib/data/lineup";

try {
  process.loadEnvFile(".env.test.local");
} catch {
  // Datei optional – ohne Zugangsdaten werden die Tests übersprungen.
}

const URL = process.env.SUPABASE_TEST_URL;
const KEY = process.env.SUPABASE_TEST_PUBLISHABLE_KEY;
const SERVICE = process.env.SUPABASE_TEST_SERVICE_ROLE_KEY;
const enabled = Boolean(URL && KEY && SERVICE);

type Client = SupabaseClient<Database>;

const run = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
const password = `Test-${run}-Passwort!`;
const emails = {
  coachA: `courtiq-a-${run}@example.test`,
  coachB: `courtiq-b-${run}@example.test`,
  viewerA: `courtiq-v-${run}@example.test`,
};

const anonClient = () => createClient<Database>(URL!, KEY!, { auth: { persistSession: false, autoRefreshToken: false } });

async function signedIn(email: string): Promise<Client> {
  const client = anonClient();
  const { error } = await client.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return client;
}

describe.skipIf(!enabled)("Supabase: Datenmodell, RLS und Aufstellung", () => {
  let admin: SupabaseClient;
  const userIds: string[] = [];
  let a: Client;
  let b: Client;
  let viewer: Client;
  let teamA: string;
  let teamB: string;
  let lineupA: string;
  const playersA: string[] = [];

  beforeAll(async () => {
    admin = createClient(URL!, SERVICE!, { auth: { persistSession: false, autoRefreshToken: false } });
    for (const email of Object.values(emails)) {
      const { data, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { display_name: email.split("@")[0] } });
      if (error) throw error;
      userIds.push(data.user.id);
    }
    a = await signedIn(emails.coachA);
    b = await signedIn(emails.coachB);
    viewer = await signedIn(emails.viewerA);

    const ta = await a.rpc("create_team", { p_name: `Test A ${run}` });
    const tb = await b.rpc("create_team", { p_name: `Test B ${run}` });
    if (ta.error || tb.error) throw ta.error ?? tb.error;
    teamA = ta.data;
    teamB = tb.data;
    const { data: lineup } = await a.from("lineups").select("id").eq("team_id", teamA).eq("is_active", true).single();
    lineupA = lineup!.id;
  });

  afterAll(async () => {
    if (!admin) return;
    // Löschen der Konten entfernt per Kaskade auch Mannschaften, Spieler und Aufstellungen.
    for (const id of userIds) await admin.auth.admin.deleteUser(id);
    if (teamA) {
      const { data } = await admin.storage.from("player-photos").list(teamA, { limit: 100 });
      for (const folder of data ?? []) {
        const { data: files } = await admin.storage.from("player-photos").list(`${teamA}/${folder.name}`);
        await admin.storage.from("player-photos").remove((files ?? []).map((f) => `${teamA}/${folder.name}/${f.name}`));
      }
    }
  });

  it("1/2: Trainer:in legt Spieler an, die nach erneutem Laden vorhanden sind", async () => {
    for (const [first, last, pos] of [
      ["Tim", "Torwart", "TW"],
      ["Lea", "Links", "LA"],
      ["Max", "Mitte", "RM"],
      ["Ben", "Bank", "RR"],
    ] as const) {
      const { data, error } = await a.from("players").insert({ team_id: teamA, first_name: first, last_name: last, primary_position: pos }).select("id").single();
      expect(error).toBeNull();
      playersA.push(data!.id);
    }
    const fresh = await signedIn(emails.coachA);
    const { data } = await fresh.from("players").select("id, first_name").eq("team_id", teamA);
    expect(data).toHaveLength(4);
  });

  it("Datenbank lehnt ungültige Eingaben ab", async () => {
    const bad = await a.from("players").insert({ team_id: teamA, first_name: "X", last_name: "Y", primary_position: "XX" });
    expect(bad.error).not.toBeNull();
    const jersey1 = await a.from("players").update({ jersey_number: 7 }).eq("id", playersA[0]);
    expect(jersey1.error).toBeNull();
    const jersey2 = await a.from("players").update({ jersey_number: 7 }).eq("id", playersA[1]);
    expect(jersey2.error?.code).toBe("23505");
  });

  it("9: Motivationsampel speichert Status und setzt den Bewertungszeitpunkt serverseitig", async () => {
    const { data, error } = await a
      .from("players")
      .update({ motivation_status: "yellow", motivation_note: "Wechselhaft nach Verletzung", motivation_assessed_at: "2000-01-01T00:00:00Z" })
      .eq("id", playersA[1])
      .select("motivation_status, motivation_assessed_at")
      .single();
    expect(error).toBeNull();
    expect(data!.motivation_status).toBe("yellow");
    expect(new Date(data!.motivation_assessed_at!).getFullYear()).toBeGreaterThanOrEqual(2026);
  });

  it("4–7: Zuordnen, Bank → Feld, Tausch und Feld → Bank sind atomar und konsistent", async () => {
    const [tw, la, rm, bank] = playersA;
    const move = (player: string, target: string, extra: { p_bench_index?: number; p_displaced?: string } = {}) =>
      a.rpc("move_player", { p_lineup: lineupA, p_player: player, p_target: target, ...extra });

    expect((await move(tw, "TW")).error).toBeNull();
    expect((await move(la, "LA")).error).toBeNull();
    expect((await move(rm, "RM")).error).toBeNull();
    expect((await move(bank, "BANK")).error).toBeNull();

    // Bank → belegtes Feld: Verdrängter übernimmt den Bankplatz
    expect((await move(bank, "RM")).error).toBeNull();
    let state = await fetchLineupState(a, lineupA);
    expect(state.field.RM).toBe(bank);
    expect(state.bench).toEqual([rm]);

    // Tausch zweier Feldspieler
    expect((await move(la, "RM")).error).toBeNull();
    state = await fetchLineupState(a, lineupA);
    expect(state.field.RM).toBe(la);
    expect(state.field.LA).toBe(bank);

    // Feld → Bank (vorne einfügen)
    expect((await move(tw, "BANK", { p_bench_index: 0 })).error).toBeNull();
    state = await fetchLineupState(a, lineupA);
    expect(state.field.TW).toBeUndefined();
    expect(state.bench).toEqual([tw, rm]);

    // Gleichzeitige Aktionen bleiben konsistent (Zeilensperre auf der Aufstellung)
    await Promise.all([move(rm, "TW"), move(tw, "TW"), move(la, "BANK"), move(bank, "KM")]);
    state = await fetchLineupState(a, lineupA);
    const all = [...Object.values(state.field), ...state.bench];
    expect(new Set(all).size).toBe(all.length);
    const { data: rows } = await a.from("lineup_positions").select("position_code").eq("lineup_id", lineupA).neq("position_code", "BANK");
    const codes = (rows ?? []).map((r) => r.position_code);
    expect(new Set(codes).size).toBe(codes.length);
  });

  it("Löschen eines Spielers entfernt ihn sauber aus der Aufstellung", async () => {
    const { data } = await a.from("players").insert({ team_id: teamA, first_name: "Kurz", last_name: "Zeit", primary_position: "KM" }).select("id").single();
    await a.rpc("move_player", { p_lineup: lineupA, p_player: data!.id, p_target: "BANK" });
    const del = await a.from("players").delete().eq("id", data!.id).select("id");
    expect(del.data).toHaveLength(1);
    const { data: rows } = await a.from("lineup_positions").select("id").eq("player_id", data!.id);
    expect(rows).toHaveLength(0);
  });

  it("3: Foto-Upload in den privaten Bucket mit signierter URL", async () => {
    const png = Uint8Array.from(
      atob("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII="),
      (c) => c.charCodeAt(0),
    );
    const path = `${teamA}/${playersA[0]}/test-${run}.png`;
    const up = await a.storage.from("player-photos").upload(path, png, { contentType: "image/png" });
    expect(up.error).toBeNull();
    const signed = await a.storage.from("player-photos").createSignedUrl(path, 60);
    expect(signed.data?.signedUrl).toBeTruthy();
    // Öffentlicher Zugriff ist nicht möglich
    const pub = await fetch(`${URL}/storage/v1/object/public/player-photos/${path}`);
    expect(pub.ok).toBe(false);
    // Fremde Mannschaft kann weder lesen noch hochladen
    const foreignSigned = await b.storage.from("player-photos").createSignedUrl(path, 60);
    expect(foreignSigned.data?.signedUrl ?? null).toBeNull();
    const foreignUp = await b.storage.from("player-photos").upload(`${teamA}/${playersA[0]}/evil-${run}.png`, png, { contentType: "image/png" });
    expect(foreignUp.error).not.toBeNull();
    // Pfad eines Spielers aus einem anderen Team wird abgelehnt
    const wrongTeam = await a.storage.from("player-photos").upload(`${teamB}/${playersA[0]}/x-${run}.png`, png, { contentType: "image/png" });
    expect(wrongTeam.error).not.toBeNull();
  });

  it("12: Mitglieder anderer Mannschaften können fremde Daten weder lesen noch ändern", async () => {
    const read = await b.from("players").select("id").eq("team_id", teamA);
    expect(read.data).toEqual([]);
    const team = await b.from("teams").select("id").eq("id", teamA);
    expect(team.data).toEqual([]);
    const upd = await b.from("players").update({ first_name: "Hacked" }).eq("id", playersA[0]).select("id");
    expect(upd.data ?? []).toEqual([]);
    const del = await b.from("players").delete().eq("id", playersA[0]).select("id");
    expect(del.data ?? []).toEqual([]);
    const ins = await b.from("players").insert({ team_id: teamA, first_name: "X", last_name: "Y", primary_position: "TW" });
    expect(ins.error).not.toBeNull();
    const mv = await b.rpc("move_player", { p_lineup: lineupA, p_player: playersA[0], p_target: "TW" });
    expect(mv.error).not.toBeNull();
    const lp = await b.from("lineup_positions").select("id").eq("lineup_id", lineupA);
    expect(lp.data).toEqual([]);
    // Spieler eines fremden Teams kann nicht in die eigene Aufstellung geschoben werden
    const { data: lineupB } = await b.from("lineups").select("id").eq("team_id", teamB).single();
    const cross = await b.rpc("move_player", { p_lineup: lineupB!.id, p_player: playersA[0], p_target: "TW" });
    expect(cross.error).not.toBeNull();
    // Direkte Schreibzugriffe auf die Aufstellung sind gesperrt (nur über move_player)
    const direct = await a.from("lineup_positions").insert({ lineup_id: lineupA, team_id: teamA, player_id: playersA[0], position_code: "RA" });
    expect(direct.error).not.toBeNull();
  });

  it("Rolle „Nur lesen“ darf lesen, aber nichts ändern", async () => {
    const added = await a.rpc("add_team_member", { p_team: teamA, p_email: emails.viewerA, p_role: "viewer" });
    expect(added.data).toBe("added");
    const read = await viewer.from("players").select("id").eq("team_id", teamA);
    expect(read.data?.length).toBeGreaterThan(0);
    const upd = await viewer.from("players").update({ first_name: "Nope" }).eq("id", playersA[0]).select("id");
    expect(upd.data ?? []).toEqual([]);
    const mv = await viewer.rpc("move_player", { p_lineup: lineupA, p_player: playersA[0], p_target: "RA" });
    expect(mv.error).not.toBeNull();
    // Nur Eigentümer:in darf Mitglieder hinzufügen
    const escalate = await viewer.rpc("add_team_member", { p_team: teamA, p_email: emails.coachB, p_role: "coach" });
    expect(escalate.error).not.toBeNull();
  });

  it("Nicht angemeldete Clients sehen nichts", async () => {
    const anon = anonClient();
    const players = await anon.from("players").select("id");
    expect(players.data ?? []).toEqual([]);
    const mv = await anon.rpc("move_player", { p_lineup: lineupA, p_player: playersA[0], p_target: "TW" });
    expect(mv.error).not.toBeNull();
  });
});
