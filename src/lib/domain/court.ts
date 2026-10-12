/**
 * Geometrie der dargestellten Spielfeldhälfte (Maße nach IHF-Regeln, in Metern).
 * Ein komplettes Feld misst 40 × 20 m; dargestellt wird die eigene Hälfte (20 × 20 m).
 */
export const COURT = {
  width: 20,
  halfLength: 20,
  goalWidth: 3,
  goalDepth: 1,
  goalAreaRadius: 6,
  freeThrowRadius: 9,
  sevenMeter: 7,
  goalkeeperLine: 4,
  substitutionLine: 4.5,
} as const;

/** Sichtbereich des SVG inklusive Rand für Tor und Linien. */
export const COURT_VIEWBOX = {
  x: -1.2,
  y: -1.8,
  width: COURT.width + 2.4,
  height: COURT.halfLength + 2.6,
} as const;

export const GOAL_POST_LEFT = (COURT.width - COURT.goalWidth) / 2; // 8.5
export const GOAL_POST_RIGHT = GOAL_POST_LEFT + COURT.goalWidth; // 11.5

/** Rechnet Meterkoordinaten in Prozent des Sichtbereichs um (für absolut positionierte Elemente). */
export function toViewboxPercent(x: number, y: number): { left: number; top: number } {
  return {
    left: ((x - COURT_VIEWBOX.x) / COURT_VIEWBOX.width) * 100,
    top: ((y - COURT_VIEWBOX.y) / COURT_VIEWBOX.height) * 100,
  };
}

/** SVG-Pfad eines Bogens um beide Torpfosten mit Radius r (Torraum bzw. Freiwurflinie). */
export function goalArcPath(r: number): string {
  const l = GOAL_POST_LEFT;
  const rt = GOAL_POST_RIGHT;
  return `M ${l - r} 0 A ${r} ${r} 0 0 0 ${l} ${r} L ${rt} ${r} A ${r} ${r} 0 0 0 ${rt + r} 0`;
}
