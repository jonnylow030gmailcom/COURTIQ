import type { TypedSupabaseClient } from "@/lib/supabase/client";
import type { TeamRole } from "@/types/database";
import { unwrap } from "./errors";

export interface TeamMemberView {
  id: string;
  userId: string;
  role: TeamRole;
  displayName: string;
  createdAt: string;
}

export async function fetchTeamMembers(supabase: TypedSupabaseClient, teamId: string): Promise<TeamMemberView[]> {
  const members = unwrap(
    await supabase.from("team_members").select("id, user_id, role, created_at").eq("team_id", teamId).order("created_at"),
  ) ?? [];
  const ids = members.map((m) => m.user_id);
  const profiles = ids.length
    ? unwrap(await supabase.from("profiles").select("id, display_name").in("id", ids)) ?? []
    : [];
  const names = new Map(profiles.map((p) => [p.id, p.display_name]));
  return members.map((m) => ({
    id: m.id,
    userId: m.user_id,
    role: m.role,
    displayName: names.get(m.user_id) || "Unbekannt",
    createdAt: m.created_at,
  }));
}

export async function renameTeam(supabase: TypedSupabaseClient, teamId: string, name: string): Promise<void> {
  const rows = unwrap(await supabase.from("teams").update({ name: name.trim() }).eq("id", teamId).select("id"));
  if (!rows?.length) throw Object.assign(new Error("forbidden"), { code: "42501" });
}

export async function addTeamMember(
  supabase: TypedSupabaseClient,
  teamId: string,
  email: string,
  role: Exclude<TeamRole, "owner">,
): Promise<"added" | "exists" | "not_found"> {
  const { data, error } = await supabase.rpc("add_team_member", { p_team: teamId, p_email: email, p_role: role });
  if (error) throw error;
  return data as "added" | "exists" | "not_found";
}

export async function setMemberRole(supabase: TypedSupabaseClient, memberId: string, role: Exclude<TeamRole, "owner">) {
  const { error } = await supabase.rpc("set_member_role", { p_member: memberId, p_role: role });
  if (error) throw error;
}

export async function removeTeamMember(supabase: TypedSupabaseClient, memberId: string): Promise<void> {
  const rows = unwrap(await supabase.from("team_members").delete().eq("id", memberId).select("id"));
  if (!rows?.length) throw Object.assign(new Error("forbidden"), { code: "42501" });
}

export async function updateDisplayName(supabase: TypedSupabaseClient, userId: string, name: string): Promise<void> {
  unwrap(await supabase.from("profiles").update({ display_name: name.trim() }).eq("id", userId).select("id"));
}

export const ROLE_LABEL: Record<TeamRole, string> = {
  owner: "Cheftrainer:in (Eigentümer)",
  coach: "Trainer:in",
  viewer: "Nur lesen",
};
