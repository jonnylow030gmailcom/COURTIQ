import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/session";
import { AuthFrame } from "@/components/layout/auth-frame";
import { CreateTeamForm } from "@/components/auth/create-team-form";

export const metadata: Metadata = { title: "Mannschaft anlegen" };

export default async function OnboardingPage() {
  const { supabase, user } = await requireUser();
  const { data: membership } = await supabase
    .from("team_members")
    .select("id")
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle();
  if (membership) redirect("/dashboard");

  return (
    <AuthFrame
      title="Mannschaft anlegen"
      subtitle="Lege deine Mannschaft an. Weitere Trainer:innen kannst du danach in den Einstellungen hinzufügen."
    >
      <CreateTeamForm />
    </AuthFrame>
  );
}
