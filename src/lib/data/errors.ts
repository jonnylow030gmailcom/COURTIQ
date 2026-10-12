/** Fehler aus Supabase/Netzwerk in verständliche deutsche Meldungen übersetzen (ohne technische Details). */
export class DataError extends Error {
  constructor(
    message: string,
    public readonly code?: string,
  ) {
    super(message);
    this.name = "DataError";
  }
}

interface ErrorLike {
  message?: string;
  code?: string;
  details?: string | null;
  status?: number;
  statusCode?: string | number;
}

export function toUserMessage(error: unknown, fallback = "Die Aktion ist fehlgeschlagen. Bitte erneut versuchen."): string {
  if (error instanceof DataError) return error.message;
  const e = (error ?? {}) as ErrorLike;
  const message = (e.message ?? "").toLowerCase();
  const code = e.code ?? "";

  if (message.includes("failed to fetch") || message.includes("networkerror") || message.includes("network request failed") || message.includes("load failed")) {
    return "Keine Verbindung zum Server. Bitte Internetverbindung prüfen und erneut versuchen.";
  }
  if (code === "23505" && message.includes("jersey")) return "Diese Trikotnummer ist in der Mannschaft bereits vergeben.";
  if (code === "23505") return "Dieser Eintrag existiert bereits.";
  if (code === "42501" || message.includes("forbidden") || message.includes("row-level security") || e.status === 403) {
    return "Dafür fehlt die Berechtigung.";
  }
  if (code === "P0002" || message.includes("player_not_found")) return "Der Spieler existiert nicht mehr.";
  if (message.includes("lineup_not_found")) return "Die Aufstellung wurde nicht gefunden.";
  if (code === "23514" || code === "22023" || code === "22P02") return "Die Eingaben sind ungültig. Bitte prüfen.";
  if (code === "PGRST116") return "Der Eintrag wurde nicht gefunden.";
  if (message.includes("jwt") || e.status === 401) return "Die Anmeldung ist abgelaufen. Bitte neu anmelden.";
  if (message.includes("payload too large") || e.statusCode === "413" || e.status === 413) {
    return "Die Datei ist zu groß.";
  }
  return fallback;
}

/** Wirft bei Supabase-Fehlern, damit Aufrufer mit try/catch arbeiten können. */
export function unwrap<T>(result: { data: T; error: unknown }): T {
  if (result.error) throw result.error;
  return result.data;
}

/** Wie unwrap, aber ein fehlender Datensatz gilt als Fehler. */
export function unwrapRequired<T>(result: { data: T | null; error: unknown }): T {
  if (result.error) throw result.error;
  if (result.data === null) throw Object.assign(new Error("not_found"), { code: "PGRST116" });
  return result.data;
}
