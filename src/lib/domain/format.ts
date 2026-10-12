const dateFormatter = new Intl.DateTimeFormat("de-DE", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  timeZone: "Europe/Berlin",
});

const dateTimeFormatter = new Intl.DateTimeFormat("de-DE", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "Europe/Berlin",
});

const relativeFormatter = new Intl.RelativeTimeFormat("de-DE", { numeric: "auto" });

/** Parst ein ISO-Datum (YYYY-MM-DD) ohne Zeitzonenverschiebung. */
function parseIsoDate(value: string): { y: number; m: number; d: number } | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;
  return { y: Number(match[1]), m: Number(match[2]), d: Number(match[3]) };
}

/** Alter in vollen Jahren – wird immer berechnet, nie gespeichert. */
export function calculateAge(birthDate: string | null | undefined, today: Date = new Date()): number | null {
  if (!birthDate) return null;
  const parsed = parseIsoDate(birthDate);
  if (!parsed) return null;
  const ty = today.getFullYear();
  const tm = today.getMonth() + 1;
  const td = today.getDate();
  let age = ty - parsed.y;
  if (tm < parsed.m || (tm === parsed.m && td < parsed.d)) age -= 1;
  return age >= 0 ? age : null;
}

export function formatDate(value: string | null | undefined): string {
  if (!value) return "–";
  const parsed = parseIsoDate(value);
  if (parsed) {
    return `${String(parsed.d).padStart(2, "0")}.${String(parsed.m).padStart(2, "0")}.${parsed.y}`;
  }
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "–" : dateFormatter.format(date);
}

export function formatDateTime(value: string | null | undefined): string {
  if (!value) return "–";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "–" : `${dateTimeFormatter.format(date)} Uhr`;
}

export function formatRelative(value: string | null | undefined, now: Date = new Date()): string {
  if (!value) return "–";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "–";
  const diffSeconds = Math.round((date.getTime() - now.getTime()) / 1000);
  const abs = Math.abs(diffSeconds);
  if (abs < 60) return "gerade eben";
  if (abs < 3600) return relativeFormatter.format(Math.round(diffSeconds / 60), "minute");
  if (abs < 86400) return relativeFormatter.format(Math.round(diffSeconds / 3600), "hour");
  if (abs < 86400 * 30) return relativeFormatter.format(Math.round(diffSeconds / 86400), "day");
  return formatDate(value);
}

export function initials(firstName: string, lastName: string): string {
  return `${firstName.trim().charAt(0)}${lastName.trim().charAt(0)}`.toUpperCase() || "?";
}

export function fullName(p: { first_name: string; last_name: string }): string {
  return `${p.first_name} ${p.last_name}`.trim();
}

export function todayIso(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}
