"use client";

import { Lock, UserX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/layout/empty-state";
import { GuardedLink } from "@/components/layout/guarded-link";
import { useTeamData } from "@/components/providers/team-data-provider";
import { PlayerForm } from "./player-form";

function NoPermission() {
  return (
    <EmptyState
      icon={Lock}
      title="Keine Berechtigung"
      description="Spieler anlegen und bearbeiten dürfen nur Trainer:innen der Mannschaft."
      action={
        <Button render={<GuardedLink href="/team" />} nativeButton={false} variant="outline">
          Zur Teamübersicht
        </Button>
      }
    />
  );
}

export function NewPlayerView() {
  const { canEdit } = useTeamData();
  if (!canEdit) return <NoPermission />;
  return <PlayerForm />;
}

export function EditPlayerView({ playerId }: { playerId: string }) {
  const { canEdit, playersById } = useTeamData();
  const player = playersById.get(playerId);
  if (!canEdit) return <NoPermission />;
  if (!player) {
    return (
      <EmptyState
        icon={UserX}
        title="Spieler nicht gefunden"
        description="Dieser Spieler existiert nicht (mehr)."
        action={
          <Button render={<GuardedLink href="/team" />} nativeButton={false}>
            Zur Teamübersicht
          </Button>
        }
      />
    );
  }
  // key: Formular bei Wechsel des Spielers neu initialisieren
  return <PlayerForm key={player.id} player={player} />;
}
