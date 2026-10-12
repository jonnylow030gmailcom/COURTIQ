import type { Metadata } from "next";
import { PageHeader } from "@/components/layout/page-header";
import { NewPlayerView } from "@/components/player/player-form-views";

export const metadata: Metadata = { title: "Neuer Spieler" };

export default function NeuerSpielerPage() {
  return (
    <>
      <PageHeader eyebrow="Spieler" title="Neuen Spieler anlegen" description="Nur Vor- und Nachname sind Pflicht – alles andere kann später ergänzt werden." />
      <NewPlayerView />
    </>
  );
}
