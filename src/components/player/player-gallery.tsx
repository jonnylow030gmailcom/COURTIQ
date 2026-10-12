"use client";

import { useDeferredValue, useMemo, useState } from "react";
import { Search, SearchX, UserPlus, Users } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { GuardedLink } from "@/components/layout/guarded-link";
import { EmptyState } from "@/components/layout/empty-state";
import { useTeamData } from "@/components/providers/team-data-provider";
import { filterAndSortPlayers } from "@/lib/team/list";
import { isFieldPositionCode, positionLabel } from "@/lib/domain/positions";
import type { MotivationStatus } from "@/lib/domain/motivation";
import { PlayerAvatar } from "./player-avatar";
import { MotivationBadge } from "./motivation-badge";
import { PositionBadge } from "./position-badge";

/** Kartenansicht aller Spielerprofile – Einstieg in die Detailansicht. */
export function PlayerGallery() {
  const { players, locate, photoUrl, canEdit } = useTeamData();
  const [query, setQuery] = useState("");
  const deferred = useDeferredValue(query);
  const rows = useMemo(
    () => filterAndSortPlayers(players, locate, { query: deferred, position: "all", motivation: "all" }, { key: "position", dir: "asc" }),
    [players, locate, deferred],
  );

  if (players.length === 0) {
    return (
      <EmptyState
        icon={Users}
        title="Noch keine Spielerprofile"
        description="Lege den ersten Spieler an, um Stärken, Verhalten und Notizen festzuhalten."
        action={
          canEdit ? (
            <Button render={<GuardedLink href="/spieler/neu" />} nativeButton={false}>
              <UserPlus /> Ersten Spieler anlegen
            </Button>
          ) : undefined
        }
      />
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="relative max-w-md">
        <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
        <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Spieler suchen…" aria-label="Spieler suchen" className="h-10 pl-9" />
      </div>
      {rows.length === 0 ? (
        <EmptyState compact icon={SearchX} title="Kein Spieler gefunden" />
      ) : (
        <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
          {rows.map(({ player, age, location }) => (
            <li key={player.id}>
              <GuardedLink
                href={`/spieler/${player.id}`}
                className="group relative flex h-full flex-col overflow-hidden rounded-2xl border border-border bg-card p-5 transition-all outline-none hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-[0_18px_40px_-24px_color-mix(in_oklch,var(--primary)_60%,transparent)] focus-visible:ring-3 focus-visible:ring-ring/60"
              >
                {player.jersey_number !== null && (
                  <span aria-hidden className="pointer-events-none absolute -top-3 right-2 text-7xl font-black text-foreground/[0.05] tabular-nums">
                    {player.jersey_number}
                  </span>
                )}
                <div className="flex items-center gap-4">
                  <PlayerAvatar firstName={player.first_name} lastName={player.last_name} photoUrl={photoUrl(player)} size="lg" />
                  <div className="min-w-0">
                    <p className="truncate text-sm text-muted-foreground">{player.first_name}</p>
                    <p className="truncate text-lg leading-tight font-bold">{player.last_name}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {isFieldPositionCode(player.primary_position) ? positionLabel(player.primary_position) : player.primary_position}
                      {age !== null && ` · ${age} J.`}
                    </p>
                  </div>
                </div>
                <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-border pt-3">
                  <div className="flex items-center gap-1.5">
                    <PositionBadge code={player.primary_position} />
                    <span className="text-xs text-muted-foreground">
                      {location.kind === "field" ? `Start · ${location.code}` : location.kind === "bench" ? "Bank" : ""}
                    </span>
                  </div>
                  <MotivationBadge status={player.motivation_status as MotivationStatus} size="sm" />
                </div>
              </GuardedLink>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
