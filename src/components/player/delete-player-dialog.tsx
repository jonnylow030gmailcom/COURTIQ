"use client";

import { useState } from "react";
import { Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { useTeamData } from "@/components/providers/team-data-provider";
import { fullName } from "@/lib/domain/format";
import { toUserMessage } from "@/lib/data/errors";
import type { PlayerRow } from "@/types/database";

export function DeletePlayerDialog({
  player,
  onOpenChange,
  onDeleted,
}: {
  player: PlayerRow | null;
  onOpenChange: (open: boolean) => void;
  onDeleted?: () => void;
}) {
  const { deletePlayer } = useTeamData();
  const [busy, setBusy] = useState(false);

  const confirm = async () => {
    if (!player) return;
    setBusy(true);
    try {
      await deletePlayer(player.id);
      toast.success(`${fullName(player)} wurde gelöscht.`);
      onOpenChange(false);
      onDeleted?.();
    } catch (error) {
      toast.error(toUserMessage(error, "Der Spieler konnte nicht gelöscht werden."));
    } finally {
      setBusy(false);
    }
  };

  return (
    <AlertDialog open={player !== null} onOpenChange={(open) => !busy && onOpenChange(open)}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Spieler löschen?</AlertDialogTitle>
          <AlertDialogDescription>
            {player ? fullName(player) : "Der Spieler"} wird mit allen Notizen, dem Foto und der Zuordnung in der Aufstellung
            dauerhaft gelöscht. Das kann nicht rückgängig gemacht werden.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={busy}>Abbrechen</AlertDialogCancel>
          <Button variant="destructive" onClick={() => void confirm()} disabled={busy}>
            {busy ? <Loader2 className="animate-spin" /> : <Trash2 />}
            Endgültig löschen
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
