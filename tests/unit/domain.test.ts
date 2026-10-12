import { describe, expect, it } from "vitest";
import { calculateAge, formatDate, initials } from "@/lib/domain/format";
import { COURT, COURT_VIEWBOX, GOAL_POST_LEFT, GOAL_POST_RIGHT, toViewboxPercent } from "@/lib/domain/court";
import { FIELD_POSITIONS, FIELD_POSITION_CODES } from "@/lib/domain/positions";
import { MOTIVATION, MOTIVATION_STATUSES } from "@/lib/domain/motivation";
import { rowsToLineupState } from "@/lib/data/lineup";
import { cleanEnvValue } from "@/lib/supabase/env";
import { sortNotes } from "@/lib/data/notes";

describe("sortNotes", () => {
  it("zeigt die neueste Notiz zuerst (Datum, dann Erfassungszeit)", () => {
    const sorted = sortNotes([
      { id: "a", note_date: "2026-09-01", created_at: "2026-10-01T10:00:00Z" },
      { id: "b", note_date: "2026-10-12", created_at: "2026-10-12T08:00:00Z" },
      { id: "c", note_date: "2026-10-12", created_at: "2026-10-12T09:00:00Z" },
    ]);
    expect(sorted.map((n) => n.id)).toEqual(["c", "b", "a"]);
  });
});

describe("cleanEnvValue", () => {
  it("entfernt BOM, Zero-Width-Zeichen und Leerraum", () => {
    expect(cleanEnvValue("﻿https://x.supabase.co\r\n")).toBe("https://x.supabase.co");
    expect(cleanEnvValue(" sb_publishable_abc​ ")).toBe("sb_publishable_abc");
    expect(cleanEnvValue("﻿")).toBeUndefined();
    expect(cleanEnvValue(undefined)).toBeUndefined();
  });
});

describe("calculateAge", () => {
  const today = new Date(2026, 9, 12); // 12.10.2026

  it("berechnet volle Jahre", () => {
    expect(calculateAge("2010-10-12", today)).toBe(16);
    expect(calculateAge("2010-10-13", today)).toBe(15);
    expect(calculateAge("2010-01-01", today)).toBe(16);
  });

  it("behandelt den 29. Februar korrekt", () => {
    expect(calculateAge("2008-02-29", new Date(2026, 1, 28))).toBe(17);
    expect(calculateAge("2008-02-29", new Date(2026, 2, 1))).toBe(18);
  });

  it("liefert null ohne oder mit ungültigem Datum", () => {
    expect(calculateAge(null, today)).toBeNull();
    expect(calculateAge("", today)).toBeNull();
    expect(calculateAge("12.10.2010", today)).toBeNull();
    expect(calculateAge("2030-01-01", today)).toBeNull();
  });
});

describe("Formatierung", () => {
  it("formatiert Datumswerte deutsch", () => {
    expect(formatDate("2010-03-07")).toBe("07.03.2010");
    expect(formatDate(null)).toBe("–");
  });
  it("bildet Initialen", () => {
    expect(initials("lena", "müller")).toBe("LM");
  });
});

describe("Spielfeld und Positionen", () => {
  it("hat genau sieben eindeutige Positionen", () => {
    expect(FIELD_POSITIONS).toHaveLength(7);
    expect(new Set(FIELD_POSITIONS.map((p) => p.code)).size).toBe(7);
    expect(FIELD_POSITIONS.map((p) => p.code).sort()).toEqual([...FIELD_POSITION_CODES].sort());
  });

  it("liegt mit allen Positionen innerhalb der Spielfeldhälfte", () => {
    for (const p of FIELD_POSITIONS) {
      expect(p.x).toBeGreaterThanOrEqual(0);
      expect(p.x).toBeLessThanOrEqual(COURT.width);
      expect(p.y).toBeGreaterThanOrEqual(0);
      expect(p.y).toBeLessThanOrEqual(COURT.halfLength);
    }
  });

  it("ordnet die Positionen handballtypisch an", () => {
    const by = Object.fromEntries(FIELD_POSITIONS.map((p) => [p.code, p]));
    // Torwart im Torraum und am nächsten am Tor
    expect(by.TW.y).toBeLessThan(COURT.goalAreaRadius);
    expect(by.TW.x).toBeGreaterThan(GOAL_POST_LEFT);
    expect(by.TW.x).toBeLessThan(GOAL_POST_RIGHT);
    // Außen seitlich, Rückraum davor, Kreisläufer zentral nahe am Torraum
    expect(by.LA.x).toBeLessThan(by.RL.x);
    expect(by.RR.x).toBeLessThan(by.RA.x);
    expect(by.RL.x).toBeLessThan(by.RM.x);
    expect(by.RM.x).toBeLessThan(by.RR.x);
    expect(by.RM.y).toBeGreaterThan(COURT.freeThrowRadius);
    expect(by.KM.y).toBeGreaterThan(COURT.goalAreaRadius);
    expect(by.KM.y).toBeLessThan(COURT.freeThrowRadius);
    expect(by.KM.x).toBe(COURT.width / 2);
  });

  it("rechnet Meter in Prozent des Sichtbereichs um", () => {
    expect(toViewboxPercent(COURT_VIEWBOX.x, COURT_VIEWBOX.y)).toEqual({ left: 0, top: 0 });
    const end = toViewboxPercent(COURT_VIEWBOX.x + COURT_VIEWBOX.width, COURT_VIEWBOX.y + COURT_VIEWBOX.height);
    expect(end.left).toBeCloseTo(100);
    expect(end.top).toBeCloseTo(100);
  });

  it("hält die Torbreite von 3 m ein", () => {
    expect(GOAL_POST_RIGHT - GOAL_POST_LEFT).toBe(3);
  });
});

describe("Motivation", () => {
  it("hat für jeden Status Beschriftung und Beschreibung", () => {
    for (const s of MOTIVATION_STATUSES) {
      expect(MOTIVATION[s].label.length).toBeGreaterThan(0);
      expect(MOTIVATION[s].description.length).toBeGreaterThan(0);
    }
  });
});

describe("rowsToLineupState", () => {
  it("baut Feld und sortierte Bank aus Datenbankzeilen", () => {
    const state = rowsToLineupState([
      { player_id: "a", position_code: "BANK", sort_order: 2 },
      { player_id: "b", position_code: "TW", sort_order: 0 },
      { player_id: "c", position_code: "BANK", sort_order: 0 },
      { player_id: "d", position_code: "BANK", sort_order: 1 },
      { player_id: "e", position_code: "UNBEKANNT", sort_order: 0 },
    ]);
    expect(state.field).toEqual({ TW: "b" });
    expect(state.bench).toEqual(["c", "d", "a"]);
  });
});
