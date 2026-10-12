import { describe, expect, it } from "vitest";
import { applyMove, countFieldPlayers, locatePlayer, planAssignment, pruneUnknownPlayers, type LineupState } from "@/lib/lineup/logic";

const base = (): LineupState => ({
  field: { TW: "tw", LA: "la", RM: "rm" },
  bench: ["b1", "b2", "b3"],
});

/** Jeder Spieler darf höchstens einmal vorkommen. */
function assertConsistent(state: LineupState) {
  const all = [...Object.values(state.field), ...state.bench];
  expect(new Set(all).size).toBe(all.length);
}

describe("locatePlayer", () => {
  it("findet Feld, Bank und nicht eingeteilte Spieler", () => {
    const s = base();
    expect(locatePlayer(s, "la")).toEqual({ kind: "field", code: "LA" });
    expect(locatePlayer(s, "b2")).toEqual({ kind: "bench", index: 1 });
    expect(locatePlayer(s, "x")).toEqual({ kind: "none" });
  });
});

describe("applyMove – Spielfeld", () => {
  it("ordnet einen freien Spieler einer leeren Position zu", () => {
    const next = applyMove(base(), { playerId: "new", target: "RA" });
    expect(next.field.RA).toBe("new");
    assertConsistent(next);
  });

  it("verschiebt einen Feldspieler auf eine freie Position und gibt die alte frei", () => {
    const next = applyMove(base(), { playerId: "la", target: "RA" });
    expect(next.field.RA).toBe("la");
    expect(next.field.LA).toBeUndefined();
    assertConsistent(next);
  });

  it("tauscht zwei Feldspieler", () => {
    const next = applyMove(base(), { playerId: "la", target: "RM" });
    expect(next.field.RM).toBe("la");
    expect(next.field.LA).toBe("rm");
    assertConsistent(next);
  });

  it("Bank → belegte Position: Verdrängter übernimmt den Bankplatz", () => {
    const next = applyMove(base(), { playerId: "b2", target: "RM" });
    expect(next.field.RM).toBe("b2");
    expect(next.bench).toEqual(["b1", "rm", "b3"]);
    assertConsistent(next);
  });

  it("Bank → freie Position: Spieler verlässt die Bank", () => {
    const next = applyMove(base(), { playerId: "b1", target: "KM" });
    expect(next.field.KM).toBe("b1");
    expect(next.bench).toEqual(["b2", "b3"]);
    assertConsistent(next);
  });

  it("frei → belegte Position: Verdrängter standardmäßig auf die Bank", () => {
    const next = applyMove(base(), { playerId: "new", target: "TW" });
    expect(next.field.TW).toBe("new");
    expect(next.bench).toEqual(["b1", "b2", "b3", "tw"]);
    assertConsistent(next);
  });

  it("frei → belegte Position mit displaced='none': Verdrängter wird entfernt", () => {
    const next = applyMove(base(), { playerId: "new", target: "TW", displaced: "none" });
    expect(next.field.TW).toBe("new");
    expect(next.bench).toEqual(["b1", "b2", "b3"]);
    expect(locatePlayer(next, "tw")).toEqual({ kind: "none" });
  });

  it("ist ein No-op, wenn der Spieler schon auf der Zielposition steht", () => {
    const s = base();
    expect(applyMove(s, { playerId: "la", target: "LA" })).toBe(s);
  });

  it("wirft bei ungültigem Ziel", () => {
    // @ts-expect-error – absichtlich ungültig
    expect(() => applyMove(base(), { playerId: "la", target: "XX" })).toThrow();
  });
});

describe("applyMove – Bank", () => {
  it("Feld → Bank hängt ans Ende an", () => {
    const next = applyMove(base(), { playerId: "la", target: "BANK" });
    expect(next.field.LA).toBeUndefined();
    expect(next.bench).toEqual(["b1", "b2", "b3", "la"]);
  });

  it("fügt an einem Index ein", () => {
    const next = applyMove(base(), { playerId: "la", target: "BANK", benchIndex: 1 });
    expect(next.bench).toEqual(["b1", "la", "b2", "b3"]);
  });

  it("sortiert innerhalb der Bank um (Index ohne den bewegten Spieler)", () => {
    const next = applyMove(base(), { playerId: "b3", target: "BANK", benchIndex: 0 });
    expect(next.bench).toEqual(["b3", "b1", "b2"]);
    const next2 = applyMove(base(), { playerId: "b1", target: "BANK", benchIndex: 2 });
    expect(next2.bench).toEqual(["b2", "b3", "b1"]);
  });

  it("begrenzt zu große oder negative Indizes", () => {
    expect(applyMove(base(), { playerId: "x", target: "BANK", benchIndex: 99 }).bench).toEqual(["b1", "b2", "b3", "x"]);
    expect(applyMove(base(), { playerId: "x", target: "BANK", benchIndex: -5 }).bench).toEqual(["x", "b1", "b2", "b3"]);
  });

  it("Bank → Bank ohne Index ist ein No-op", () => {
    const s = base();
    expect(applyMove(s, { playerId: "b1", target: "BANK" })).toBe(s);
  });

  it("nimmt beliebig viele Spieler auf", () => {
    let s: LineupState = { field: {}, bench: [] };
    for (let i = 0; i < 40; i++) s = applyMove(s, { playerId: `p${i}`, target: "BANK" });
    expect(s.bench).toHaveLength(40);
    assertConsistent(s);
  });
});

describe("applyMove – entfernen", () => {
  it("nimmt Feld- und Bankspieler aus der Aufstellung", () => {
    const a = applyMove(base(), { playerId: "rm", target: "NONE" });
    expect(a.field.RM).toBeUndefined();
    const b = applyMove(base(), { playerId: "b2", target: "NONE" });
    expect(b.bench).toEqual(["b1", "b3"]);
  });
});

describe("applyMove – Folgen schneller Aktionen", () => {
  it("bleibt bei vielen Aktionen hintereinander konsistent", () => {
    let s = base();
    const moves = [
      { playerId: "b1", target: "RL" },
      { playerId: "rm", target: "RL" },
      { playerId: "la", target: "BANK", benchIndex: 0 },
      { playerId: "b3", target: "LA" },
      { playerId: "tw", target: "NONE" },
      { playerId: "new", target: "TW" },
      { playerId: "b2", target: "RM" },
    ] as const;
    for (const m of moves) {
      s = applyMove(s, m);
      assertConsistent(s);
    }
    expect(countFieldPlayers(s)).toBeGreaterThan(0);
  });

  it("ist unveränderlich (Originalzustand bleibt erhalten)", () => {
    const s = base();
    const snapshot = JSON.stringify(s);
    applyMove(s, { playerId: "la", target: "RM" });
    applyMove(s, { playerId: "b1", target: "BANK", benchIndex: 2 });
    expect(JSON.stringify(s)).toBe(snapshot);
  });
});

describe("planAssignment (Dialoge)", () => {
  it("fragt nach, wenn ein Feldspieler auf eine freie Position verschoben werden soll", () => {
    expect(planAssignment(base(), "la", "KM")).toEqual({ kind: "confirm-move", from: "LA" });
  });

  it("tauscht direkt, wenn das Ziel mit einem anderen Feldspieler belegt ist", () => {
    expect(planAssignment(base(), "la", "RM")).toMatchObject({ kind: "direct", swapWith: "rm" });
  });

  it("fragt nach, was mit dem Verdrängten passiert, wenn ein freier Spieler eine belegte Position bekommt", () => {
    expect(planAssignment(base(), "new", "TW")).toEqual({ kind: "ask-displaced", occupantId: "tw" });
  });

  it("Bankspieler auf belegte Position ist eindeutig", () => {
    expect(planAssignment(base(), "b1", "RM")).toMatchObject({ kind: "direct", swapWith: "rm" });
  });

  it("erkennt No-ops", () => {
    expect(planAssignment(base(), "la", "LA")).toEqual({ kind: "noop" });
    expect(planAssignment(base(), "b1", "BANK")).toEqual({ kind: "noop" });
    expect(planAssignment(base(), "x", "NONE")).toEqual({ kind: "noop" });
  });
});

describe("pruneUnknownPlayers", () => {
  it("entfernt gelöschte Spieler aus Feld und Bank", () => {
    const next = pruneUnknownPlayers(base(), new Set(["tw", "b2"]));
    expect(next).toEqual({ field: { TW: "tw" }, bench: ["b2"] });
  });
});
