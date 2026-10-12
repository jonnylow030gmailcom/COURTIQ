/**
 * Zentrale Positionskonfiguration.
 *
 * Koordinaten in Metern im Koordinatensystem einer Spielfeldhälfte:
 * x = 0 … 20 (Seitenlinie links → rechts), y = 0 … 20 (Torlinie → Mittellinie).
 * Das Tor liegt oben bei y = 0 zwischen x = 8.5 und x = 11.5.
 * Positionen hier anpassen – Spielfeld, Dialoge und Listen übernehmen sie automatisch.
 */
export const FIELD_POSITION_CODES = ["TW", "LA", "RL", "RM", "RR", "RA", "KM"] as const;

export type FieldPositionCode = (typeof FIELD_POSITION_CODES)[number];
export type LineupTarget = FieldPositionCode | "BANK" | "NONE";

export interface FieldPosition {
  code: FieldPositionCode;
  label: string;
  /** x in Metern (0–20) */
  x: number;
  /** y in Metern ab Torlinie (0–20) */
  y: number;
}

export const FIELD_POSITIONS: readonly FieldPosition[] = [
  { code: "TW", label: "Torwart", x: 10, y: 1.6 },
  { code: "LA", label: "Linksaußen", x: 1.7, y: 2.6 },
  { code: "RL", label: "Rückraum links", x: 4.4, y: 10.6 },
  { code: "RM", label: "Rückraum Mitte", x: 10, y: 12.4 },
  { code: "RR", label: "Rückraum rechts", x: 15.6, y: 10.6 },
  { code: "RA", label: "Rechtsaußen", x: 18.3, y: 2.6 },
  { code: "KM", label: "Kreisläufer", x: 10, y: 7.1 },
] as const;

const BY_CODE = new Map(FIELD_POSITIONS.map((p) => [p.code, p]));

export function isFieldPositionCode(value: unknown): value is FieldPositionCode {
  return typeof value === "string" && (FIELD_POSITION_CODES as readonly string[]).includes(value);
}

export function getFieldPosition(code: FieldPositionCode): FieldPosition {
  const position = BY_CODE.get(code);
  if (!position) throw new Error(`Unbekannte Position: ${code}`);
  return position;
}

export function positionLabel(code: FieldPositionCode): string {
  return getFieldPosition(code).label;
}

/** Feste Reihenfolge für Sortierung und Listen (Torwart, dann von links nach rechts). */
export const POSITION_SORT_ORDER: Record<FieldPositionCode, number> = {
  TW: 0,
  LA: 1,
  RL: 2,
  RM: 3,
  RR: 4,
  RA: 5,
  KM: 6,
};
