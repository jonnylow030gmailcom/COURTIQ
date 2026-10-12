import { z } from "zod";
import { FIELD_POSITION_CODES, type FieldPositionCode } from "@/lib/domain/positions";
import { MOTIVATION_STATUSES } from "@/lib/domain/motivation";
import { todayIso } from "@/lib/domain/format";
import type { PlayerRow, PlayerUpdate, ThrowingHand } from "@/types/database";

const LONG_TEXT_MAX = 5000;

const longText = z.string().max(LONG_TEXT_MAX, `Maximal ${LONG_TEXT_MAX} Zeichen.`);
const tags = z
  .array(z.string().trim().min(1).max(40, "Ein Stichwort darf höchstens 40 Zeichen lang sein."))
  .max(30, "Höchstens 30 Stichworte.");

const optionalIntString = (min: number, max: number, message: string) =>
  z
    .string()
    .trim()
    .refine((v) => v === "" || (/^\d+$/.test(v) && Number(v) >= min && Number(v) <= max), message);

export const playerFormSchema = z.object({
    first_name: z.string().trim().min(1, "Bitte den Vornamen eingeben.").max(60, "Maximal 60 Zeichen."),
    last_name: z.string().trim().min(1, "Bitte den Nachnamen eingeben.").max(60, "Maximal 60 Zeichen."),
    birth_date: z
      .string()
      .refine((v) => v === "" || /^\d{4}-\d{2}-\d{2}$/.test(v), "Bitte ein gültiges Datum eingeben.")
      .refine((v) => v === "" || (v >= "1900-01-01" && v <= todayIso()), "Das Geburtsdatum darf nicht in der Zukunft liegen."),
    jersey_number: optionalIntString(0, 99, "Trikotnummer zwischen 0 und 99."),
    primary_position: z
      .string()
      .refine((v) => v === "" || (FIELD_POSITION_CODES as readonly string[]).includes(v), "Bitte eine gültige Position wählen."),
    alternative_positions: z.array(z.enum(FIELD_POSITION_CODES)),
    height_cm: optionalIntString(100, 230, "Größe zwischen 100 und 230 cm."),
    throwing_hand: z.enum(["", "left", "right", "both"]),
    strengths: tags,
    strengths_notes: longText,
    weaknesses: tags,
    weaknesses_notes: longText,
    attack_traits: tags,
    attack_behavior: longText,
    defense_traits: tags,
    defense_behavior: longText,
    tactical_notes: longText,
    coach_notes: longText,
    general_notes: longText,
    motivation_status: z.enum(MOTIVATION_STATUSES),
    motivation_note: z.string().max(2000, "Maximal 2000 Zeichen."),
  });
// Hinweis: Ist die Hauptposition zugleich als Alternative markiert, wird sie beim Speichern entfernt.

export type PlayerFormValues = z.infer<typeof playerFormSchema>;

export const EMPTY_PLAYER_FORM: PlayerFormValues = {
  first_name: "",
  last_name: "",
  birth_date: "",
  jersey_number: "",
  primary_position: "",
  alternative_positions: [],
  height_cm: "",
  throwing_hand: "",
  strengths: [],
  strengths_notes: "",
  weaknesses: [],
  weaknesses_notes: "",
  attack_traits: [],
  attack_behavior: "",
  defense_traits: [],
  defense_behavior: "",
  tactical_notes: "",
  coach_notes: "",
  general_notes: "",
  motivation_status: "unrated",
  motivation_note: "",
};

const nullIfEmpty = (v: string) => (v.trim() === "" ? null : v.trim());
const uniqueTags = (list: string[]) => {
  const seen = new Set<string>();
  return list
    .map((t) => t.trim())
    .filter((t) => {
      const key = t.toLocaleLowerCase("de-DE");
      if (!t || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
};

/** Formularwerte → Datenbankfelder (ohne team_id, photo_path). */
export function toPlayerPayload(values: PlayerFormValues): Required<
  Omit<PlayerUpdate, "photo_path" | "motivation_assessed_at">
> {
  return {
    first_name: values.first_name.trim(),
    last_name: values.last_name.trim(),
    birth_date: nullIfEmpty(values.birth_date),
    jersey_number: values.jersey_number.trim() === "" ? null : Number(values.jersey_number),
    primary_position: values.primary_position === "" ? null : values.primary_position,
    alternative_positions: values.alternative_positions.filter((p) => p !== values.primary_position),
    height_cm: values.height_cm.trim() === "" ? null : Number(values.height_cm),
    throwing_hand: values.throwing_hand === "" ? null : (values.throwing_hand as ThrowingHand),
    strengths: uniqueTags(values.strengths),
    strengths_notes: nullIfEmpty(values.strengths_notes),
    weaknesses: uniqueTags(values.weaknesses),
    weaknesses_notes: nullIfEmpty(values.weaknesses_notes),
    attack_traits: uniqueTags(values.attack_traits),
    attack_behavior: nullIfEmpty(values.attack_behavior),
    defense_traits: uniqueTags(values.defense_traits),
    defense_behavior: nullIfEmpty(values.defense_behavior),
    tactical_notes: nullIfEmpty(values.tactical_notes),
    coach_notes: nullIfEmpty(values.coach_notes),
    general_notes: nullIfEmpty(values.general_notes),
    motivation_status: values.motivation_status,
    motivation_note: nullIfEmpty(values.motivation_note),
  };
}

/** Datenbankzeile → Formularwerte. */
export function toPlayerFormValues(player: PlayerRow): PlayerFormValues {
  return {
    first_name: player.first_name,
    last_name: player.last_name,
    birth_date: player.birth_date ?? "",
    jersey_number: player.jersey_number === null ? "" : String(player.jersey_number),
    primary_position: player.primary_position ?? "",
    alternative_positions: player.alternative_positions.filter((p): p is FieldPositionCode =>
      (FIELD_POSITION_CODES as readonly string[]).includes(p),
    ),
    height_cm: player.height_cm === null ? "" : String(player.height_cm),
    throwing_hand: player.throwing_hand ?? "",
    strengths: player.strengths,
    strengths_notes: player.strengths_notes ?? "",
    weaknesses: player.weaknesses,
    weaknesses_notes: player.weaknesses_notes ?? "",
    attack_traits: player.attack_traits,
    attack_behavior: player.attack_behavior ?? "",
    defense_traits: player.defense_traits,
    defense_behavior: player.defense_behavior ?? "",
    tactical_notes: player.tactical_notes ?? "",
    coach_notes: player.coach_notes ?? "",
    general_notes: player.general_notes ?? "",
    motivation_status: player.motivation_status,
    motivation_note: player.motivation_note ?? "",
  };
}

// ---------------------------------------------------------------------------
// Fotos
// ---------------------------------------------------------------------------
export const PHOTO_ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;
export const PHOTO_MAX_INPUT_BYTES = 15 * 1024 * 1024;
export const PHOTO_MAX_UPLOAD_BYTES = 5 * 1024 * 1024;

export function validatePhotoFile(file: { type: string; size: number }): string | null {
  if (!(PHOTO_ACCEPTED_TYPES as readonly string[]).includes(file.type)) {
    return "Bitte ein Bild im Format JPG, PNG oder WebP wählen.";
  }
  if (file.size > PHOTO_MAX_INPUT_BYTES) {
    return "Das Bild ist zu groß (maximal 15 MB).";
  }
  return null;
}

export const THROWING_HAND_LABEL: Record<ThrowingHand, string> = {
  left: "Links",
  right: "Rechts",
  both: "Beidhändig",
};

/** Vorschläge für Stichworte – frei erweiterbar, eigene Begriffe sind jederzeit möglich. */
export const TAG_SUGGESTIONS = {
  strengths: [
    "Wurfkraft",
    "Schnelligkeit",
    "Spielübersicht",
    "1-gegen-1",
    "Passspiel",
    "Sprungkraft",
    "Kampfgeist",
    "Führungsqualität",
    "Siebenmeter",
    "Gegenstoß",
  ],
  weaknesses: [
    "Abschlussquote",
    "Rückzugsverhalten",
    "Kondition",
    "Ballverluste",
    "Entscheidungsfindung",
    "Zweikampfhärte",
    "Konzentration",
    "Schwache Hand",
  ],
  attack: [
    "Durchbruch",
    "Rückraumwurf",
    "Sperren",
    "Kreuzen",
    "Anspiel an den Kreis",
    "Tempogegenstoß",
    "Schlagwurf",
    "Täuschungen",
  ],
  defense: [
    "6:0-Innenblock",
    "Offensive Deckung",
    "Antizipation",
    "Blockspiel",
    "Beinarbeit",
    "Kommunikation",
    "Ballgewinne",
    "Zeitstrafen-Risiko",
  ],
} as const;
