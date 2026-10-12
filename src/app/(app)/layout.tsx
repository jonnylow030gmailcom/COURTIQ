import type { ReactNode } from "react";
import { requireAppSession } from "@/lib/auth/session";
import { TeamDataProvider } from "@/components/providers/team-data-provider";
import { AppShell } from "@/components/layout/app-shell";
import { TeamDataGate } from "@/components/layout/team-data-gate";

export default async function AppLayout({ children }: { children: ReactNode }) {
  const session = await requireAppSession();

  return (
    <TeamDataProvider key={session.team.id} team={session.team} currentUserId={session.userId}>
      <AppShell displayName={session.displayName}>
        <TeamDataGate>{children}</TeamDataGate>
      </AppShell>
    </TeamDataProvider>
  );
}
