"use client";

import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import { getSupabaseEnv } from "./env";

export type TypedSupabaseClient = SupabaseClient<Database>;

let browserClient: TypedSupabaseClient | undefined;

/** Ein gemeinsamer Browser-Client (Session aus Cookies, RLS greift für alle Abfragen). */
export function getSupabaseBrowserClient(): TypedSupabaseClient {
  if (!browserClient) {
    const { url, key } = getSupabaseEnv();
    browserClient = createBrowserClient<Database>(url, key);
  }
  return browserClient;
}
