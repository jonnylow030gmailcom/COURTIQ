import { describe, expect, it } from "vitest";
import { EMPTY_PLAYER_FORM, playerFormSchema, toPlayerFormValues, toPlayerPayload, validatePhotoFile, type PlayerFormValues } from "@/lib/validation/player";
import { filterAndSortPlayers } from "@/lib/team/list";
import { locatePlayer, type LineupState } from "@/lib/lineup/logic";
import { toUserMessage } from "@/lib/data/errors";
import type { PlayerRow } from "@/types/database";

const valid: PlayerFormValues = {
  ...EMPTY_PLAYER_FORM,
  first_name: " Lena ",
  last_name: "Müller",
  primary_position: "RL",
  alternative_positions: ["RM", "RL"],
  birth_date: "2009-05-01",
  jersey_number: "7",
  height_cm: "",
  strengths: ["Wurfkraft", "wurfkraft ", "Schnelligkeit"],
  motivation_status: "green",
};

describe("playerFormSchema", () => {
  it("akzeptiert gültige Eingaben", () => {
    expect(playerFormSchema.safeParse(valid).success).toBe(true);
  });

  it("verlangt Vorname, Nachname und Position", () => {
    const result = playerFormSchema.safeParse(EMPTY_PLAYER_FORM);
    expect(result.success).toBe(false);
    const fields = result.error!.issues.map((i) => i.path[0]);
    expect(fields).toEqual(expect.arrayContaining(["first_name", "last_name", "primary_position"]));
  });

  it("lehnt ungültige Zahlen und Zukunftsdaten ab", () => {
    expect(playerFormSchema.safeParse({ ...valid, jersey_number: "100" }).success).toBe(false);
    expect(playerFormSchema.safeParse({ ...valid, jersey_number: "-1" }).success).toBe(false);
    expect(playerFormSchema.safeParse({ ...valid, height_cm: "50" }).success).toBe(false);
    expect(playerFormSchema.safeParse({ ...valid, birth_date: "2999-01-01" }).success).toBe(false);
    expect(playerFormSchema.safeParse({ ...valid, primary_position: "XX" }).success).toBe(false);
  });

  it("begrenzt die Textlänge", () => {
    expect(playerFormSchema.safeParse({ ...valid, general_notes: "x".repeat(5001) }).success).toBe(false);
  });
});

describe("toPlayerPayload", () => {
  it("bereinigt Werte für die Datenbank", () => {
    const payload = toPlayerPayload(valid);
    expect(payload.first_name).toBe("Lena");
    expect(payload.jersey_number).toBe(7);
    expect(payload.height_cm).toBeNull();
    expect(payload.alternative_positions).toEqual(["RM"]); // Hauptposition entfernt
    expect(payload.strengths).toEqual(["Wurfkraft", "Schnelligkeit"]); // Duplikate ohne Groß-/Kleinschreibung entfernt
    expect(payload.general_notes).toBeNull();
    expect(payload.motivation_status).toBe("green");
    // Alter wird nie gespeichert
    expect(Object.keys(payload)).not.toContain("age");
  });
});

describe("validatePhotoFile", () => {
  it("prüft Typ und Größe", () => {
    expect(validatePhotoFile({ type: "image/jpeg", size: 1000 })).toBeNull();
    expect(validatePhotoFile({ type: "image/gif", size: 1000 })).not.toBeNull();
    expect(validatePhotoFile({ type: "image/png", size: 20 * 1024 * 1024 })).not.toBeNull();
  });
});

function player(partial: Partial<PlayerRow> & Pick<PlayerRow, "id" | "first_name" | "last_name">): PlayerRow {
  return {
    team_id: "t",
    birth_date: null,
    jersey_number: null,
    primary_position: "RM",
    alternative_positions: [],
    height_cm: null,
    throwing_hand: null,
    photo_path: null,
    strengths: [],
    strengths_notes: null,
    weaknesses: [],
    weaknesses_notes: null,
    attack_traits: [],
    attack_behavior: null,
    defense_traits: [],
    defense_behavior: null,
    tactical_notes: null,
    coach_notes: null,
    general_notes: null,
    motivation_status: "unrated",
    motivation_note: null,
    motivation_assessed_at: null,
    created_at: "2026-10-01T10:00:00Z",
    updated_at: "2026-10-01T10:00:00Z",
    ...partial,
  };
}

describe("filterAndSortPlayers", () => {
  const players = [
    player({ id: "1", first_name: "Jonas", last_name: "Öztürk", birth_date: "2008-01-01", primary_position: "TW", motivation_status: "green" }),
    player({ id: "2", first_name: "Ben", last_name: "Adler", birth_date: "2010-01-01", primary_position: "RA", motivation_status: "red" }),
    player({ id: "3", first_name: "Lukas", last_name: "Meier", primary_position: "KM", alternative_positions: ["RA"], motivation_status: "yellow" }),
  ];
  const lineup: LineupState = { field: { TW: "1" }, bench: ["2"] };
  const locate = (id: string) => locatePlayer(lineup, id);
  const all = { query: "", position: "all" as const, motivation: "all" as const };
  const today = new Date(2026, 9, 12);

  it("sortiert nach Name", () => {
    const ids = filterAndSortPlayers(players, locate, all, { key: "name", dir: "asc" }, today).map((r) => r.player.id);
    expect(ids).toEqual(["2", "3", "1"]);
  });

  it("sortiert nach Alter, ohne Geburtsdatum immer am Ende", () => {
    const asc = filterAndSortPlayers(players, locate, all, { key: "age", dir: "asc" }, today).map((r) => r.player.id);
    expect(asc).toEqual(["2", "1", "3"]);
    const desc = filterAndSortPlayers(players, locate, all, { key: "age", dir: "desc" }, today).map((r) => r.player.id);
    expect(desc).toEqual(["1", "2", "3"]);
  });

  it("sortiert nach Position und Motivation", () => {
    expect(filterAndSortPlayers(players, locate, all, { key: "position", dir: "asc" }, today).map((r) => r.player.id)).toEqual(["1", "2", "3"]);
    expect(filterAndSortPlayers(players, locate, all, { key: "motivation", dir: "asc" }, today).map((r) => r.player.id)).toEqual(["2", "3", "1"]);
  });

  it("sucht akzent-unabhängig nach Vor- und Nachname", () => {
    expect(filterAndSortPlayers(players, locate, { ...all, query: "ozt" }, { key: "name", dir: "asc" }, today)).toHaveLength(1);
    expect(filterAndSortPlayers(players, locate, { ...all, query: "ben" }, { key: "name", dir: "asc" }, today)[0].player.id).toBe("2");
  });

  it("filtert nach Position (inkl. Alternativen) und Motivation", () => {
    expect(filterAndSortPlayers(players, locate, { ...all, position: "RA" }, { key: "name", dir: "asc" }, today).map((r) => r.player.id)).toEqual(["2", "3"]);
    expect(filterAndSortPlayers(players, locate, { ...all, motivation: "red" }, { key: "name", dir: "asc" }, today).map((r) => r.player.id)).toEqual(["2"]);
  });

  it("liefert Aufstellungsstatus und Alter mit", () => {
    const rows = filterAndSortPlayers(players, locate, all, { key: "name", dir: "asc" }, today);
    expect(rows.find((r) => r.player.id === "1")).toMatchObject({ age: 18, location: { kind: "field", code: "TW" } });
    expect(rows.find((r) => r.player.id === "2")?.location).toEqual({ kind: "bench", index: 0 });
    expect(rows.find((r) => r.player.id === "3")?.location).toEqual({ kind: "none" });
  });

  it("funktioniert bei leerer Mannschaft", () => {
    expect(filterAndSortPlayers([], locate, all, { key: "name", dir: "asc" })).toEqual([]);
  });
});

describe("toPlayerFormValues", () => {
  it("ist die Umkehrung von toPlayerPayload", () => {
    const row = player({ id: "x", first_name: "A", last_name: "B", jersey_number: 9, height_cm: 188, alternative_positions: ["RL", "QQ"] });
    const values = toPlayerFormValues(row);
    expect(values.jersey_number).toBe("9");
    expect(values.height_cm).toBe("188");
    expect(values.alternative_positions).toEqual(["RL"]);
  });
});

describe("toUserMessage", () => {
  it("übersetzt typische Fehler ohne technische Details", () => {
    expect(toUserMessage({ message: "TypeError: Failed to fetch" })).toMatch(/Verbindung/);
    expect(toUserMessage({ code: "42501", message: "forbidden" })).toMatch(/Berechtigung/);
    expect(toUserMessage({ code: "23505", message: 'duplicate key value violates unique constraint "players_team_jersey_uidx"' })).toMatch(/Trikotnummer/);
    expect(toUserMessage({ code: "P0002", message: "player_not_found" })).toMatch(/existiert nicht/);
    expect(toUserMessage(new Error("irgendwas"))).not.toMatch(/irgendwas/);
  });
});
