import type { Metadata } from "next";
import { requireAppSession } from "@/lib/auth/session";
import { PageHeader } from "@/components/layout/page-header";
import { SettingsView } from "@/components/settings/settings-view";

export const metadata: Metadata = { title: "Einstellungen" };

export default async function EinstellungenPage() {
  const session = await requireAppSession();
  return (
    <>
      <PageHeader eyebrow="Verwaltung" title="Einstellungen" />
      <SettingsView userId={session.userId} email={session.email} displayName={session.displayName} />
    </>
  );
}
