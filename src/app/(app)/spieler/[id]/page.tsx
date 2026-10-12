import type { Metadata } from "next";
import { PlayerProfile } from "@/components/player/player-profile";

export const metadata: Metadata = { title: "Spielerprofil" };

export default async function SpielerDetailPage({ params }: PageProps<"/spieler/[id]">) {
  const { id } = await params;
  return <PlayerProfile playerId={id} />;
}
