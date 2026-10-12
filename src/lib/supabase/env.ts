/**
 * Entfernt unsichtbare Zeichen (BOM, Zero-Width) und Leerraum. Solche Zeichen können beim
 * Eintragen von Umgebungsvariablen (z. B. über PowerShell) hineingeraten und führen in
 * HTTP-Headern zu Fehlern („Cannot convert value … ByteString“).
 */
export function cleanEnvValue(value: string | undefined): string | undefined {
  const cleaned = value?.replace(/[﻿​-‍⁠]/g, "").trim();
  return cleaned ? cleaned : undefined;
}

/** Öffentliche Supabase-Konfiguration (URL + Publishable/Anon-Key, nie den Service-Role-Key). */
export function getSupabaseEnv(): { url: string; key: string } {
  const url = cleanEnvValue(process.env.NEXT_PUBLIC_SUPABASE_URL);
  const key = cleanEnvValue(process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY);
  if (!url || !key) {
    throw new Error(
      "Supabase ist nicht konfiguriert: NEXT_PUBLIC_SUPABASE_URL und NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY in .env.local eintragen.",
    );
  }
  return { url, key };
}

export function isSupabaseConfigured(): boolean {
  return Boolean(
    cleanEnvValue(process.env.NEXT_PUBLIC_SUPABASE_URL) && cleanEnvValue(process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY),
  );
}
