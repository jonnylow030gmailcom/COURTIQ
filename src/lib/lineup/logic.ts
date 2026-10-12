import {
  FIELD_POSITION_CODES,
  isFieldPositionCode,
  type FieldPositionCode,
  type LineupTarget,
} from "@/lib/domain/positions";

/**
 * Reine Aufstellungslogik. Die Regeln entsprechen exakt der Datenbankfunktion
 * public.move_player (supabase/migrations/…_init_schema.sql), damit die optimistische
 * Anzeige im Client und das gespeicherte Ergebnis übereinstimmen.
 */
export interface LineupState {
  field: Partial<Record<FieldPositionCode, string>>;
  bench: string[];
}

export type PlayerLocation =
  | { kind: "field"; code: FieldPositionCode }
  | { kind: "bench"; index: number }
  | { kind: "none" };

export type DisplacedHandling = "bench" | "none";

export interface MoveCommand {
  playerId: string;
  target: LineupTarget;
  /** Zielindex auf der Bank – Index in der Bankliste ohne den bewegten Spieler. */
  benchIndex?: number | null;
  /** Nur relevant, wenn ein nicht eingeteilter Spieler auf eine belegte Position gesetzt wird. */
  displaced?: DisplacedHandling;
}

export const EMPTY_LINEUP: LineupState = { field: {}, bench: [] };

export function locatePlayer(state: LineupState, playerId: string): PlayerLocation {
  for (const code of FIELD_POSITION_CODES) {
    if (state.field[code] === playerId) return { kind: "field", code };
  }
  const index = state.bench.indexOf(playerId);
  if (index >= 0) return { kind: "bench", index };
  return { kind: "none" };
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

export function applyMove(state: LineupState, command: MoveCommand): LineupState {
  const { playerId, target } = command;
  const displaced = command.displaced ?? "bench";
  const source = locatePlayer(state, playerId);
  const field = { ...state.field };
  let bench = [...state.bench];

  const removeFromSource = () => {
    if (source.kind === "field") delete field[source.code];
    if (source.kind === "bench") bench = bench.filter((id) => id !== playerId);
  };

  if (target === "NONE") {
    removeFromSource();
    return { field, bench };
  }

  if (target === "BANK") {
    if (source.kind === "bench" && (command.benchIndex === undefined || command.benchIndex === null)) {
      return state;
    }
    removeFromSource();
    const index = clamp(command.benchIndex ?? bench.length, 0, bench.length);
    bench.splice(index, 0, playerId);
    return { field, bench };
  }

  if (!isFieldPositionCode(target)) {
    throw new Error(`Ungültiges Ziel: ${String(target)}`);
  }
  if (source.kind === "field" && source.code === target) return state;

  const occupant = field[target];

  if (occupant && occupant !== playerId) {
    if (source.kind === "field") {
      field[source.code] = occupant;
      field[target] = playerId;
      return { field, bench };
    }
    if (source.kind === "bench") {
      bench[source.index] = occupant;
      field[target] = playerId;
      return { field, bench };
    }
    // Spieler war nicht eingeteilt
    if (displaced === "bench") bench.push(occupant);
    field[target] = playerId;
    return { field, bench };
  }

  removeFromSource();
  field[target] = playerId;
  return { field, bench };
}

/**
 * Bewertet eine Zuordnung aus einem Dialog (nicht Drag-and-drop) und entscheidet,
 * ob sie eindeutig ist oder eine Rückfrage braucht.
 */
export type AssignmentPlan =
  | { kind: "noop" }
  | { kind: "direct"; description: string; swapWith?: string }
  | { kind: "confirm-move"; from: FieldPositionCode }
  | { kind: "ask-displaced"; occupantId: string };

export function planAssignment(
  state: LineupState,
  playerId: string,
  target: LineupTarget,
): AssignmentPlan {
  const source = locatePlayer(state, playerId);

  if (target === "NONE") {
    return source.kind === "none" ? { kind: "noop" } : { kind: "direct", description: "remove" };
  }
  if (target === "BANK") {
    return source.kind === "bench" ? { kind: "noop" } : { kind: "direct", description: "bench" };
  }
  if (source.kind === "field" && source.code === target) return { kind: "noop" };

  const occupant = state.field[target];
  if (occupant) {
    if (source.kind === "field") return { kind: "direct", description: "swap", swapWith: occupant };
    if (source.kind === "bench") return { kind: "direct", description: "bench-swap", swapWith: occupant };
    return { kind: "ask-displaced", occupantId: occupant };
  }

  // Ziel ist frei: Wer schon auf einer anderen Feldposition steht, wird nicht unbemerkt verschoben.
  if (source.kind === "field") return { kind: "confirm-move", from: source.code };
  return { kind: "direct", description: "assign" };
}

export function countFieldPlayers(state: LineupState): number {
  return FIELD_POSITION_CODES.filter((code) => Boolean(state.field[code])).length;
}

/** Entfernt Spieler, die nicht (mehr) existieren – schützt die Anzeige vor verwaisten Einträgen. */
export function pruneUnknownPlayers(state: LineupState, knownIds: ReadonlySet<string>): LineupState {
  const field: LineupState["field"] = {};
  for (const code of FIELD_POSITION_CODES) {
    const id = state.field[code];
    if (id && knownIds.has(id)) field[code] = id;
  }
  return { field, bench: state.bench.filter((id) => knownIds.has(id)) };
}
