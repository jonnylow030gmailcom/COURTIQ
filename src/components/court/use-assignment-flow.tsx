"use client";

import { useCallback, useState, type ReactNode } from "react";
import { ArrowRightLeft, Armchair, UserMinus } from "lucide-react";
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
import { planAssignment, type DisplacedHandling } from "@/lib/lineup/logic";
import { isFieldPositionCode, positionLabel, type FieldPositionCode, type LineupTarget } from "@/lib/domain/positions";
import { fullName } from "@/lib/domain/format";

type Pending =
  | { kind: "confirm-move"; playerId: string; target: FieldPositionCode; from: FieldPositionCode }
  | { kind: "ask-displaced"; playerId: string; target: FieldPositionCode; occupantId: string };

export function targetLabel(target: LineupTarget): string {
  if (target === "BANK") return "Ersatzbank";
  if (target === "NONE") return "nicht eingeteilt";
  return `${positionLabel(target)} (${target})`;
}

/**
 * Zuordnung über Dialoge/Menüs: eindeutige Aktionen werden direkt ausgeführt,
 * mehrdeutige mit einer Rückfrage bestätigt. Liefert den Rückfrage-Dialog als Element.
 */
export function useAssignmentFlow(): {
  request: (playerId: string, target: LineupTarget) => Promise<boolean>;
  dialog: ReactNode;
} {
  const { lineup, movePlayer, playersById } = useTeamData();
  const [pending, setPending] = useState<Pending | null>(null);

  const nameOf = useCallback(
    (id: string) => {
      const p = playersById.get(id);
      return p ? fullName(p) : "Spieler";
    },
    [playersById],
  );

  const request = useCallback(
    async (playerId: string, target: LineupTarget) => {
      const plan = planAssignment(lineup, playerId, target);
      switch (plan.kind) {
        case "noop":
          toast.info(`${nameOf(playerId)} ist bereits ${target === "BANK" ? "auf der Bank" : target === "NONE" ? "nicht eingeteilt" : `auf ${target}`}.`);
          return false;
        case "direct": {
          const ok = await movePlayer({ playerId, target });
          if (ok && plan.swapWith && isFieldPositionCode(target)) {
            toast.success(`${nameOf(playerId)} und ${nameOf(plan.swapWith)} wurden getauscht.`);
          }
          return ok;
        }
        case "confirm-move":
          if (!isFieldPositionCode(target)) return false;
          setPending({ kind: "confirm-move", playerId, target, from: plan.from });
          return false;
        case "ask-displaced":
          if (!isFieldPositionCode(target)) return false;
          setPending({ kind: "ask-displaced", playerId, target, occupantId: plan.occupantId });
          return false;
      }
    },
    [lineup, movePlayer, nameOf],
  );

  const resolve = async (displaced?: DisplacedHandling) => {
    if (!pending) return;
    const current = pending;
    setPending(null);
    await movePlayer({ playerId: current.playerId, target: current.target, displaced });
  };

  const dialog = (
    <AlertDialog open={pending !== null} onOpenChange={(open) => !open && setPending(null)}>
      <AlertDialogContent>
        {pending?.kind === "confirm-move" && (
          <>
            <AlertDialogHeader>
              <AlertDialogTitle>Spieler verschieben?</AlertDialogTitle>
              <AlertDialogDescription>
                {nameOf(pending.playerId)} steht bereits auf {targetLabel(pending.from)}. Soll er nach{" "}
                {targetLabel(pending.target)} verschoben werden? Die Position {pending.from} wird dann frei.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Abbrechen</AlertDialogCancel>
              <Button onClick={() => void resolve()}>
                <ArrowRightLeft /> Verschieben
              </Button>
            </AlertDialogFooter>
          </>
        )}
        {pending?.kind === "ask-displaced" && (
          <>
            <AlertDialogHeader>
              <AlertDialogTitle>Position {pending.target} ist besetzt</AlertDialogTitle>
              <AlertDialogDescription>
                Auf {targetLabel(pending.target)} steht {nameOf(pending.occupantId)}. Was soll mit{" "}
                {nameOf(pending.occupantId)} passieren, wenn {nameOf(pending.playerId)} die Position übernimmt?
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="sm:flex-wrap">
              <AlertDialogCancel>Abbrechen</AlertDialogCancel>
              <Button variant="outline" onClick={() => void resolve("none")}>
                <UserMinus /> Aus Aufstellung nehmen
              </Button>
              <Button onClick={() => void resolve("bench")}>
                <Armchair /> Auf die Bank
              </Button>
            </AlertDialogFooter>
          </>
        )}
      </AlertDialogContent>
    </AlertDialog>
  );

  return { request, dialog };
}
