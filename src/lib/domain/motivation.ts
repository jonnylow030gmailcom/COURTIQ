export const MOTIVATION_STATUSES = ["green", "yellow", "red", "unrated"] as const;
export type MotivationStatus = (typeof MOTIVATION_STATUSES)[number];

export interface MotivationMeta {
  status: MotivationStatus;
  label: string;
  short: string;
  description: string;
  /** Sortierreihenfolge: Beobachtungsbedarf zuerst */
  rank: number;
}

/**
 * Trainingsmotivation als interne Trainerbeobachtung. Der Status wird nur manuell
 * gesetzt und niemals aus anderen Eigenschaften abgeleitet.
 */
export const MOTIVATION: Record<MotivationStatus, MotivationMeta> = {
  green: {
    status: "green",
    label: "Hoch",
    short: "Grün",
    description: "Hohe bzw. gute Trainingsmotivation",
    rank: 2,
  },
  yellow: {
    status: "yellow",
    label: "Wechselhaft",
    short: "Gelb",
    description: "Mittlere oder wechselhafte Trainingsmotivation",
    rank: 1,
  },
  red: {
    status: "red",
    label: "Niedrig",
    short: "Rot",
    description: "Niedrige Motivation bzw. besonderer Beobachtungsbedarf",
    rank: 0,
  },
  unrated: {
    status: "unrated",
    label: "Unbewertet",
    short: "–",
    description: "Noch keine Bewertung vorhanden",
    rank: 3,
  },
};
