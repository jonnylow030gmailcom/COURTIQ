import { COURT, COURT_VIEWBOX, GOAL_POST_LEFT, GOAL_POST_RIGHT, goalArcPath } from "@/lib/domain/court";

/**
 * Spielfeldhälfte als skalierbares SVG im Meter-Koordinatensystem (1 Einheit = 1 m).
 * Tor oben (Torlinie bei y = 0), Mittellinie unten (y = 20).
 */
export function CourtMarkings() {
  const lw = 0.08; // Linienbreite (real 5–8 cm)
  const mid = COURT.width / 2;
  const goalAreaPath = goalArcPath(COURT.goalAreaRadius);
  const freeThrowPath = goalArcPath(COURT.freeThrowRadius);
  const subY = COURT.halfLength - COURT.substitutionLine;

  return (
    <svg
      viewBox={`${COURT_VIEWBOX.x} ${COURT_VIEWBOX.y} ${COURT_VIEWBOX.width} ${COURT_VIEWBOX.height}`}
      className="absolute inset-0 size-full"
      role="img"
      aria-label="Handballfeld, eigene Spielfeldhälfte mit Tor, 6-Meter-Torraum, 9-Meter-Linie und 7-Meter-Marke"
      preserveAspectRatio="xMidYMid meet"
    >
      <defs>
        <clipPath id="court-clip">
          <rect x={0} y={0} width={COURT.width} height={COURT.halfLength} />
        </clipPath>
        <pattern id="court-planks" width="20" height="0.9" patternUnits="userSpaceOnUse">
          <rect width="20" height="0.9" fill="transparent" />
          <line x1="0" y1="0.9" x2="20" y2="0.9" stroke="var(--court-line)" strokeOpacity="0.035" strokeWidth="0.03" />
        </pattern>
        <radialGradient id="goal-area-fill" cx="50%" cy="0%" r="70%">
          <stop offset="0%" stopColor="var(--court-area)" stopOpacity="0.55" />
          <stop offset="100%" stopColor="var(--court-area)" stopOpacity="0.28" />
        </radialGradient>
        <pattern id="goal-net" width="0.25" height="0.25" patternUnits="userSpaceOnUse">
          <path d="M0 0 L0.25 0.25 M0.25 0 L0 0.25" stroke="var(--court-line)" strokeOpacity="0.35" strokeWidth="0.02" />
        </pattern>
      </defs>

      {/* Spielfläche */}
      <rect x={0} y={0} width={COURT.width} height={COURT.halfLength} fill="url(#court-planks)" />

      <g clipPath="url(#court-clip)">
        {/* Torraum (6 m) */}
        <path d={`${goalAreaPath} Z`} fill="url(#goal-area-fill)" />
        {/* Freiwurflinie (9 m, gestrichelt) */}
        <path
          d={freeThrowPath}
          fill="none"
          stroke="var(--court-line)"
          strokeOpacity="0.75"
          strokeWidth={lw}
          strokeDasharray="0.3 0.3"
        />
      </g>

      <g fill="none" stroke="var(--court-line)" strokeWidth={lw} strokeLinecap="butt">
        {/* Begrenzung */}
        <rect x={0} y={0} width={COURT.width} height={COURT.halfLength} strokeOpacity="0.9" />
        {/* Torraumlinie */}
        <path d={goalAreaPath} strokeOpacity="0.95" />
        {/* 7-m-Linie (1 m breit) */}
        <line x1={mid - 0.5} y1={COURT.sevenMeter} x2={mid + 0.5} y2={COURT.sevenMeter} strokeOpacity="0.95" />
        {/* Torwartgrenzlinie (4 m, 15 cm) */}
        <line
          x1={mid - 0.075}
          y1={COURT.goalkeeperLine}
          x2={mid + 0.075}
          y2={COURT.goalkeeperLine}
          strokeOpacity="0.95"
        />
        {/* Mittellinie */}
        <line x1={0} y1={COURT.halfLength} x2={COURT.width} y2={COURT.halfLength} strokeOpacity="0.9" />
        {/* Auswechsellinien (4,5 m von der Mittellinie) */}
        <line x1={-0.3} y1={subY} x2={0.15} y2={subY} strokeOpacity="0.7" />
        <line x1={COURT.width - 0.15} y1={subY} x2={COURT.width + 0.3} y2={subY} strokeOpacity="0.7" />
      </g>

      {/* Mittelanwurfkreis (Ausschnitt, Ø 4 m) */}
      <path
        d={`M ${mid - 2} ${COURT.halfLength} A 2 2 0 0 1 ${mid + 2} ${COURT.halfLength}`}
        fill="none"
        stroke="var(--court-line)"
        strokeOpacity="0.4"
        strokeWidth={lw}
      />

      {/* Tor (3 m × 2 m, Tiefe ~1 m) */}
      <g>
        <rect
          x={GOAL_POST_LEFT}
          y={-COURT.goalDepth}
          width={COURT.goalWidth}
          height={COURT.goalDepth}
          fill="url(#goal-net)"
          stroke="var(--court-line)"
          strokeOpacity="0.5"
          strokeWidth={0.05}
        />
        <line
          x1={GOAL_POST_LEFT}
          y1={0}
          x2={GOAL_POST_RIGHT}
          y2={0}
          stroke="var(--court-line)"
          strokeWidth={0.16}
          strokeLinecap="round"
        />
        {[GOAL_POST_LEFT, GOAL_POST_RIGHT].map((x) => (
          <circle key={x} cx={x} cy={0} r={0.13} fill="var(--court-line)" />
        ))}
      </g>

      {/* Maßangaben */}
      <g
        fill="var(--court-line)"
        fillOpacity="0.45"
        fontSize="0.55"
        fontWeight="600"
        fontFamily="var(--font-exo), sans-serif"
        textAnchor="middle"
        style={{ letterSpacing: "0.04em" }}
      >
        <text x={mid + 2.9} y={COURT.goalAreaRadius + 0.5}>6 m</text>
        <text x={mid + 2.6} y={COURT.freeThrowRadius + 0.6}>9 m</text>
      </g>
    </svg>
  );
}
