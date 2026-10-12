import "server-only";

import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { TeamRole } from "@/types/database";

export interface AppSession {
  userId: string;
  email: string;
  displayName: string;
  team: { id: string; name: string; role: TeamRole };
}

/** Angemeldete:n Benutzer:in ermitteln oder zur Anmeldung umleiten. */
export async function requireUser() {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) redirect("/login");
  return { supabase, user: data.user };
}

/**
 * Lädt die Mannschaft aus der Mitgliedschaftstabelle (nicht aus Client-Angaben).
 * Ohne Mannschaft geht es zum Onboarding.
 */
export async function requireAppSession(): Promise<AppSession> {
  const { supabase, user } = await requireUser();

  const [{ data: membership }, { data: profile }] = await Promise.all([
    supabase
      .from("team_members")
      .select("role, team_id, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle(),
    supabase.from("profiles").select("display_name").eq("id", user.id).maybeSingle(),
  ]);

  if (!membership) redirect("/onboarding");

  const { data: team } = await supabase.from("teams").select("id, name").eq("id", membership.team_id).maybeSingle();
  if (!team) redirect("/onboarding");

  return {
    userId: user.id,
    email: user.email ?? "",
    displayName: profile?.display_name || user.email?.split("@")[0] || "Trainer:in",
    team: { id: team.id, name: team.name, role: membership.role },
  };
}
