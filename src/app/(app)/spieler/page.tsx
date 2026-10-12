import type { Metadata } from "next";
import { PageHeader } from "@/components/layout/page-header";
import { PlayerGallery } from "@/components/player/player-gallery";
import { NewPlayerButton } from "@/components/player/new-player-button";

export const metadata: Metadata = { title: "Spieler" };

export default function SpielerPage() {
  return (
    <>
      <PageHeader eyebrow="Profile" title="Spieler" description="Individuelle Spielerprofile mit Stärken, Verhalten und Trainer-Notizen." actions={<NewPlayerButton />} />
      <PlayerGallery />
    </>
  );
}
