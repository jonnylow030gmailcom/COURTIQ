import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { Database } from "@/types/database";
import { getSupabaseEnv, isSupabaseConfigured } from "./env";

const PUBLIC_PATHS = ["/login", "/auth"];

/**
 * Erneuert die Supabase-Session bei jeder Anfrage und leitet nicht angemeldete
 * Besucher:innen zur Anmeldung. Die eigentliche Berechtigung prüft die Datenbank (RLS).
 */
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });
  if (!isSupabaseConfigured()) return response;

  const { url, key } = getSupabaseEnv();
  const supabase = createServerClient<Database>(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });

  // Wichtig: getClaims() direkt nach dem Erzeugen aufrufen, damit abgelaufene Tokens erneuert werden.
  const { data } = await supabase.auth.getClaims();
  const isAuthenticated = Boolean(data?.claims?.sub);
  const path = request.nextUrl.pathname;
  const isPublic = PUBLIC_PATHS.some((p) => path === p || path.startsWith(`${p}/`));

  if (!isAuthenticated && !isPublic) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/login";
    redirectUrl.search = "";
    if (path !== "/") redirectUrl.searchParams.set("next", path);
    const redirect = NextResponse.redirect(redirectUrl);
    response.cookies.getAll().forEach((c) => redirect.cookies.set(c));
    return redirect;
  }

  return response;
}
