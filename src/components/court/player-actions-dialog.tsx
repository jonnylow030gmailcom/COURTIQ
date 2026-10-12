"use client";

import { Armchair, ExternalLink, Replace, UserMinus } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { GuardedLink } from "@/components/layout/guarded-link";
import { PlayerAvatar } from "@/components/player/player-avatar";
import { MotivationBadge } from "@/components/player/motivation-badge";
import { PositionBadge } from "@/components/player/position-badge";
import { useTeamData } from "@/components/providers/team-data-provider";
import { calculateAge, fullName, initials } from "@/lib/domain/format";
import { FIELD_POSITIONS, type LineupTarget } from "@/lib/domain/positions";
import { cn } from "@/lib/utils";
import type { MotivationStatus } from "@/lib/domain/motivation";

interface PlayerActionsDialogProps {
  playerId: string | null;
  onOpenChange: (open: boolean) => void;
  onMove: (playerId: string, target: LineupTarget) => void;
  onReplace: (target: LineupTarget) => void;
}

/**
 * Aktionen für einen Spieler auf Feld oder Bank – zugleich die barrierefreie
 * Alternative zu Drag-and-drop (vollständig per Tastatur bedienbar).
 */
export function PlayerActionsDialog({ playerId, onOpenChange, onMove, onReplace }: PlayerActionsDialogProps) {
  const { playersById, photoUrl, locate, lineup, canEdit } = useTeamData();
  const player = playerId ? playersById.get(playerId) : undefined;
  const location = playerId ? locate(playerId) : { kind: "none" as const };
  const age = calculateAge(player?.birth_date);

  return (
    <Dialog open={Boolean(player)} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        {player && (
          <>
            <DialogHeader className="flex-row items-center gap-4">
              <PlayerAvatar firstName={player.first_name} lastName={player.last_name} photoUrl={photoUrl(player)} size="lg" />
              <div className="min-w-0">
                <DialogTitle className="truncate text-lg font-bold">
                  {fullName(player)}
                  {player.jersey_number !== null && <span className="ml-2 text-muted-foreground">#{player.jersey_number}</span>}
                </DialogTitle>
                <DialogDescription className="mt-1 flex flex-wrap items-center gap-2">
                  <PositionBadge code={player.primary_position} />
                  {age !== null && <span>{age} Jahre</span>}
                  <span>·</span>
                  <span>
                    {location.kind === "field" ? `Auf ${location.code}` : location.kind === "bench" ? "Auf der Bank" : "Nicht eingeteilt"}
                  </span>
                </DialogDescription>
                <MotivationBadge status={player.motivation_status as MotivationStatus} size="sm" className="mt-2" />
              </div>
            </DialogHeader>

            {canEdit && (
              <div className="space-y-3">
                <p className="text-xs font-semibold tracking-[0.14em] text-muted-foreground uppercase">Verschieben nach</p>
                <div className="grid grid-cols-4 gap-2">
                  {FIELD_POSITIONS.map((pos) => {
                    const occupantId = lineup.field[pos.code];
                    const occupant = occupantId ? playersById.get(occupantId) : undefined;
                    const isHere = occupantId === player.id;
                    return (
                      <button
                        key={pos.code}
                        type="button"
                        disabled={isHere}
                        onClick={() => onMove(player.id, pos.code)}
                        className={cn(
                          "flex h-14 flex-col items-center justify-center rounded-xl text-sm font-bold ring-1 transition-colors outline-none ring-inset focus-visible:ring-2 focus-visible:ring-ring",
                          isHere
                            ? "bg-primary text-primary-foreground ring-primary"
                            : "bg-secondary/60 ring-border hover:bg-accent hover:ring-primary/50",
                        )}
                        aria-label={`${pos.label}${occupant ? `, besetzt mit ${fullName(occupant)} – tauschen` : ", frei"}`}
                      >
                        {pos.code}
                        <span className={cn("text-[0.65rem] font-medium", isHere ? "text-primary-foreground/80" : "text-muted-foreground")}>
                          {isHere ? "hier" : occupant ? initials(occupant.first_name, occupant.last_name) : "frei"}
                        </span>
                      </button>
                    );
                  })}
                  <button
                    type="button"
                    disabled={location.kind === "bench"}
                    onClick={() => onMove(player.id, "BANK")}
                    className={cn(
                      "flex h-14 flex-col items-center justify-center rounded-xl text-xs font-bold ring-1 transition-colors outline-none ring-inset focus-visible:ring-2 focus-visible:ring-ring",
                      location.kind === "bench" ? "bg-primary text-primary-foreground ring-primary" : "bg-secondary/60 ring-border hover:bg-accent",
                    )}
                  >
                    <Armchair className="size-4" aria-hidden />
                    Bank
                  </button>
                </div>
                <div className="flex flex-wrap gap-2 pt-1">
                  {location.kind === "field" && (
                    <Button variant="outline" onClick={() => onReplace(location.code)}>
                      <Replace /> Spieler ersetzen
                    </Button>
                  )}
                  {location.kind !== "none" && (
                    <Button variant="outline" onClick={() => onMove(player.id, "NONE")}>
                      <UserMinus /> Aus Aufstellung nehmen
                    </Button>
                  )}
                </div>
              </div>
            )}

            <div className="-mx-4 -mb-4 flex justify-end gap-2 rounded-b-xl border-t border-border bg-muted/40 p-4">
              <Button render={<GuardedLink href={`/spieler/${player.id}`} />} nativeButton={false}>
                <ExternalLink /> Profil öffnen
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
