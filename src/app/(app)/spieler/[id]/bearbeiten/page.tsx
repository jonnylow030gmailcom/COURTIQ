import type { Metadata } from "next";
import { PageHeader } from "@/components/layout/page-header";
import { EditPlayerView } from "@/components/player/player-form-views";

export const metadata: Metadata = { title: "Spieler bearbeiten" };

export default async function SpielerBearbeitenPage({ params }: PageProps<"/spieler/[id]/bearbeiten">) {
  const { id } = await params;
  return (
    <>
      <PageHeader eyebrow="Spieler" title="Spieler bearbeiten" />
      <EditPlayerView playerId={id} />
    </>
  );
}
