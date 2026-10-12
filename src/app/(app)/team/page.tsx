import type { Metadata } from "next";
import { PageHeader } from "@/components/layout/page-header";
import { TeamList } from "@/components/team/team-list";
import { NewPlayerButton } from "@/components/player/new-player-button";

export const metadata: Metadata = { title: "Team" };

export default function TeamPage() {
  return (
    <>
      <PageHeader eyebrow="Kader" title="Teamübersicht" description="Alle Spieler mit Position, Motivation und Aufstellungsstatus." actions={<NewPlayerButton />} />
      <TeamList />
    </>
  );
}
