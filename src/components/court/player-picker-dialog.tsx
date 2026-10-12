"use client";

import { useDeferredValue, useMemo, useState } from "react";
import { Search, UserPlus } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { GuardedLink } from "@/components/layout/guarded-link";
import { PlayerAvatar } from "@/components/player/player-avatar";
import { PositionBadge } from "@/components/player/position-badge";
import { useTeamData } from "@/components/providers/team-data-provider";
import { fullName } from "@/lib/domain/format";
import type { LineupTarget } from "@/lib/domain/positions";
import { cn } from "@/lib/utils";
import { targetLabel } from "./use-assignment-flow";

interface PlayerPickerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  target: LineupTarget | null;
  onSelect: (playerId: string) => void;
}

function normalize(value: string) {
  return value.toLocaleLowerCase("de-DE").normalize("NFD").replace(/\p{Diacritic}/gu, "");
}

/** Auswahl-Dialog: Spieler suchen und einer Position bzw. der Bank zuordnen. */
export function PlayerPickerDialog({ open, onOpenChange, target, onSelect }: PlayerPickerDialogProps) {
  const { players, photoUrl, locate } = useTeamData();
  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query);

  const list = useMemo(() => {
    const q = normalize(deferredQuery.trim());
    return players
      .filter((p) => !q || normalize(`${p.first_name} ${p.last_name}`).includes(q) || normalize(`${p.last_name} ${p.first_name}`).includes(q))
      .map((p) => ({ player: p, location: locate(p.id) }))
      .filter(({ location }) => !(target === "BANK" && location.kind === "bench"))
      .sort((a, b) => {
        // Passende Position zuerst, dann nicht eingeteilte, dann alphabetisch
        const score = (x: typeof a) =>
          (target && x.player.primary_position === target ? 0 : target && x.player.alternative_positions.includes(target) ? 1 : 2) * 10 +
          (x.location.kind === "none" ? 0 : x.location.kind === "bench" ? 1 : 2);
        return score(a) - score(b) || a.player.last_name.localeCompare(b.player.last_name, "de");
      });
  }, [players, deferredQuery, locate, target]);

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) setQuery("");
        onOpenChange(next);
      }}
    >
      <DialogContent className="flex max-h-[min(85dvh,640px)] flex-col gap-0 p-0 sm:max-w-lg">
        <DialogHeader className="border-b border-border p-5 pb-4">
          <DialogTitle className="text-lg font-bold">
            {target === "BANK" ? "Spieler auf die Bank setzen" : "Spieler zuordnen"}
          </DialogTitle>
          <DialogDescription>{target ? `Ziel: ${targetLabel(target)}` : null}</DialogDescription>
          <div className="relative mt-3">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
            <Input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Name suchen…"
              aria-label="Spieler nach Namen suchen"
              className="h-11 pl-9"
            />
          </div>
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-y-auto p-2" role="listbox" aria-label="Spieler">
          {players.length === 0 ? (
            <div className="flex flex-col items-center gap-3 px-6 py-10 text-center">
              <p className="text-sm text-muted-foreground">Es sind noch keine Spieler angelegt.</p>
              <Button render={<GuardedLink href="/spieler/neu" />} nativeButton={false}>
                <UserPlus /> Ersten Spieler anlegen
              </Button>
            </div>
          ) : list.length === 0 ? (
            <p className="px-6 py-10 text-center text-sm text-muted-foreground">Kein Spieler gefunden.</p>
          ) : (
            list.map(({ player, location }) => (
              <button
                key={player.id}
                type="button"
                role="option"
                aria-selected={false}
                onClick={() => {
                  setQuery("");
                  onSelect(player.id);
                }}
                className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors outline-none hover:bg-accent focus-visible:bg-accent focus-visible:ring-2 focus-visible:ring-ring"
              >
                <PlayerAvatar firstName={player.first_name} lastName={player.last_name} photoUrl={photoUrl(player)} size="md" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-semibold">
                    {fullName(player)}
                    {player.jersey_number !== null && (
                      <span className="ml-1.5 text-sm font-medium text-muted-foreground">#{player.jersey_number}</span>
                    )}
                  </span>
                  <span className="mt-0.5 flex items-center gap-1.5">
                    <PositionBadge code={player.primary_position} />
                    {player.alternative_positions.slice(0, 3).map((code) => (
                      <PositionBadge key={code} code={code} variant="outline" />
                    ))}
                  </span>
                </span>
                <span
                  className={cn(
                    "shrink-0 rounded-full px-2 py-0.5 text-xs font-medium",
                    location.kind === "field" && "bg-primary/15 text-primary",
                    location.kind === "bench" && "bg-secondary text-secondary-foreground",
                    location.kind === "none" && "text-muted-foreground",
                  )}
                >
                  {location.kind === "field" ? `auf ${location.code}` : location.kind === "bench" ? "Bank" : "frei"}
                </span>
              </button>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
