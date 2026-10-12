/** Öffentliche Supabase-Konfiguration (URL + Publishable/Anon-Key, nie den Service-Role-Key). */
export function getSupabaseEnv(): { url: string; key: string } {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) {
    throw new Error(
      "Supabase ist nicht konfiguriert: NEXT_PUBLIC_SUPABASE_URL und NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY in .env.local eintragen.",
    );
  }
  return { url, key };
}

export function isSupabaseConfigured(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY);
}
