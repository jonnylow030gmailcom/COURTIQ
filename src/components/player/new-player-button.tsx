"use client";

import { UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { GuardedLink } from "@/components/layout/guarded-link";
import { useTeamData } from "@/components/providers/team-data-provider";

export function NewPlayerButton() {
  const { canEdit } = useTeamData();
  if (!canEdit) return null;
  return (
    <Button render={<GuardedLink href="/spieler/neu" />} nativeButton={false}>
      <UserPlus /> Neuer Spieler
    </Button>
  );
}
