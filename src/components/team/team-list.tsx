"use client";

import { useDeferredValue, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowDown, ArrowUp, ArrowUpDown, Eye, MoreHorizontal, Pencil, Search, SearchX, Trash2, UserPlus, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/form-field";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { GuardedLink } from "@/components/layout/guarded-link";
import { EmptyState } from "@/components/layout/empty-state";
import { PlayerAvatar } from "@/components/player/player-avatar";
import { MotivationBadge } from "@/components/player/motivation-badge";
import { PositionBadge } from "@/components/player/position-badge";
import { DeletePlayerDialog } from "@/components/player/delete-player-dialog";
import { useTeamData } from "@/components/providers/team-data-provider";
import { filterAndSortPlayers, type SortDir, type SortKey, type TeamListFilter } from "@/lib/team/list";
import { FIELD_POSITIONS, type FieldPositionCode } from "@/lib/domain/positions";
import { MOTIVATION, MOTIVATION_STATUSES, type MotivationStatus } from "@/lib/domain/motivation";
import { formatDate, fullName } from "@/lib/domain/format";
import type { PlayerLocation } from "@/lib/lineup/logic";
import { cn } from "@/lib/utils";
import type { PlayerRow } from "@/types/database";

const SORT_LABEL: Record<SortKey, string> = {
  name: "Name",
  age: "Alter",
  position: "Position",
  motivation: "Motivation",
};

function LocationChip({ location }: { location: PlayerLocation }) {
  if (location.kind === "field") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-primary/15 px-2 py-0.5 text-xs font-semibold text-primary">
        Start · {location.code}
      </span>
    );
  }
  if (location.kind === "bench") {
    return <span className="inline-flex rounded-full bg-secondary px-2 py-0.5 text-xs font-semibold text-secondary-foreground">Bank</span>;
  }
  return <span className="text-xs text-muted-foreground">nicht eingeteilt</span>;
}

function SortHeader({
  k,
  className,
  sort,
  onToggle,
}: {
  k: SortKey;
  className?: string;
  sort: { key: SortKey; dir: SortDir };
  onToggle: (key: SortKey) => void;
}) {
  const active = sort.key === k;
  const Icon = !active ? ArrowUpDown : sort.dir === "asc" ? ArrowUp : ArrowDown;
  return (
    <th scope="col" className={cn("px-3 py-3 font-semibold", className)} aria-sort={active ? (sort.dir === "asc" ? "ascending" : "descending") : "none"}>
      <button
        type="button"
        onClick={() => onToggle(k)}
        className={cn(
          "inline-flex items-center gap-1.5 rounded-md px-1 py-0.5 tracking-wide uppercase transition-colors outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring",
          active && "text-foreground",
        )}
      >
        {SORT_LABEL[k]}
        <Icon className={cn("size-3.5", !active && "opacity-50")} aria-hidden />
      </button>
    </th>
  );
}

function RowActions({ player, canEdit, onDelete }: { player: PlayerRow; canEdit: boolean; onDelete: (p: PlayerRow) => void }) {
  const router = useRouter();
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={<Button variant="ghost" size="icon" aria-label={`Aktionen für ${fullName(player)}`} onClick={(e) => e.stopPropagation()} />}
      >
        <MoreHorizontal />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuItem onClick={() => router.push(`/spieler/${player.id}`)}>
          <Eye /> Profil öffnen
        </DropdownMenuItem>
        {canEdit && (
          <>
            <DropdownMenuItem onClick={() => router.push(`/spieler/${player.id}/bearbeiten`)}>
              <Pencil /> Bearbeiten
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem variant="destructive" onClick={() => onDelete(player)}>
              <Trash2 /> Löschen
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function TeamList() {
  const router = useRouter();
  const { players, locate, photoUrl, canEdit } = useTeamData();
  const [filter, setFilter] = useState<TeamListFilter>({ query: "", position: "all", motivation: "all" });
  const [sort, setSort] = useState<{ key: SortKey; dir: SortDir }>({ key: "name", dir: "asc" });
  const [toDelete, setToDelete] = useState<PlayerRow | null>(null);
  const deferredFilter = useDeferredValue(filter);

  const rows = useMemo(() => filterAndSortPlayers(players, locate, deferredFilter, sort), [players, locate, deferredFilter, sort]);
  const isFiltered = filter.query !== "" || filter.position !== "all" || filter.motivation !== "all";

  const toggleSort = (key: SortKey) =>
    setSort((s) => (s.key === key ? { key, dir: s.dir === "asc" ? "desc" : "asc" } : { key, dir: "asc" }));

  if (players.length === 0) {
    return (
      <EmptyState
        icon={Users}
        title="Die Mannschaft ist noch leer"
        description="Lege den ersten Spieler an – danach erscheint er hier, im Spielfeld und im Dashboard."
        action={
          canEdit ? (
            <Button render={<GuardedLink href="/spieler/neu" />} nativeButton={false}>
              <UserPlus /> Spieler anlegen
            </Button>
          ) : undefined
        }
      />
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Filterleiste */}
      <div className="grid gap-3 rounded-2xl border border-border bg-card p-3 sm:grid-cols-[minmax(0,1fr)_auto_auto] md:p-4">
        <div className="relative">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
          <Input
            value={filter.query}
            onChange={(e) => setFilter((f) => ({ ...f, query: e.target.value }))}
            placeholder="Vor- oder Nachname suchen…"
            aria-label="Spieler suchen"
            className="h-10 pl-9"
          />
        </div>
        <NativeSelect
          aria-label="Nach Position filtern"
          value={filter.position}
          onChange={(e) => setFilter((f) => ({ ...f, position: e.target.value as FieldPositionCode | "all" }))}
          className="sm:w-48"
        >
          <option value="all">Alle Positionen</option>
          {FIELD_POSITIONS.map((p) => (
            <option key={p.code} value={p.code}>
              {p.code} – {p.label}
            </option>
          ))}
        </NativeSelect>
        <NativeSelect
          aria-label="Nach Motivation filtern"
          value={filter.motivation}
          onChange={(e) => setFilter((f) => ({ ...f, motivation: e.target.value as MotivationStatus | "all" }))}
          className="sm:w-44"
        >
          <option value="all">Alle Motivationen</option>
          {MOTIVATION_STATUSES.map((s) => (
            <option key={s} value={s}>
              {MOTIVATION[s].short !== "–" ? `${MOTIVATION[s].short} – ` : ""}
              {MOTIVATION[s].label}
            </option>
          ))}
        </NativeSelect>
        {/* Sortierung für schmale Bildschirme (Tabelle hat klickbare Spaltenköpfe) */}
        <div className="flex gap-2 sm:col-span-3 md:hidden">
          <NativeSelect
            aria-label="Sortieren nach"
            value={sort.key}
            onChange={(e) => setSort((s) => ({ ...s, key: e.target.value as SortKey }))}
          >
            {(Object.keys(SORT_LABEL) as SortKey[]).map((k) => (
              <option key={k} value={k}>
                Sortieren: {SORT_LABEL[k]}
              </option>
            ))}
          </NativeSelect>
          <Button
            variant="outline"
            size="icon"
            onClick={() => setSort((s) => ({ ...s, dir: s.dir === "asc" ? "desc" : "asc" }))}
            aria-label={sort.dir === "asc" ? "Aufsteigend – umkehren" : "Absteigend – umkehren"}
          >
            {sort.dir === "asc" ? <ArrowUp /> : <ArrowDown />}
          </Button>
        </div>
      </div>

      <p className="px-1 text-sm text-muted-foreground" aria-live="polite">
        {rows.length} von {players.length} Spielern
      </p>

      {rows.length === 0 ? (
        <EmptyState
          compact
          icon={SearchX}
          title="Keine Treffer"
          description="Mit den gewählten Filtern wurde kein Spieler gefunden."
          action={
            isFiltered ? (
              <Button variant="outline" onClick={() => setFilter({ query: "", position: "all", motivation: "all" })}>
                Filter zurücksetzen
              </Button>
            ) : undefined
          }
        />
      ) : (
        <>
          {/* Tabelle ab Tablet */}
          <div className="hidden overflow-hidden rounded-2xl border border-border bg-card md:block">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-border bg-surface text-xs tracking-wide text-muted-foreground uppercase">
                <tr>
                  <SortHeader sort={sort} onToggle={toggleSort} k="name" className="pl-5" />
                  <SortHeader sort={sort} onToggle={toggleSort} k="age" />
                  <SortHeader sort={sort} onToggle={toggleSort} k="position" />
                  <SortHeader sort={sort} onToggle={toggleSort} k="motivation" />
                  <th scope="col" className="hidden px-3 py-3 font-semibold xl:table-cell">
                    Letzte Bewertung
                  </th>
                  <th scope="col" className="px-3 py-3 font-semibold">
                    Aufstellung
                  </th>
                  <th scope="col" className="px-3 py-3 pr-5 text-right font-semibold">
                    <span className="sr-only">Aktionen</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {rows.map(({ player, age, location }) => (
                  <tr
                    key={player.id}
                    onClick={() => router.push(`/spieler/${player.id}`)}
                    className="cursor-pointer transition-colors hover:bg-accent/40"
                  >
                    <td className="py-3 pr-3 pl-5">
                      <GuardedLink
                        href={`/spieler/${player.id}`}
                        onClick={(e) => e.stopPropagation()}
                        className="flex items-center gap-3 rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      >
                        <PlayerAvatar firstName={player.first_name} lastName={player.last_name} photoUrl={photoUrl(player)} size="md" />
                        <span className="min-w-0">
                          <span className="block truncate font-semibold">
                            {player.last_name}, {player.first_name}
                          </span>
                          {player.jersey_number !== null && (
                            <span className="text-xs text-muted-foreground tabular-nums">#{player.jersey_number}</span>
                          )}
                        </span>
                      </GuardedLink>
                    </td>
                    <td className="px-3 py-3 tabular-nums">{age ?? "–"}</td>
                    <td className="px-3 py-3">
                      <div className="flex flex-wrap items-center gap-1">
                        <PositionBadge code={player.primary_position} />
                        {player.alternative_positions.slice(0, 2).map((c) => (
                          <PositionBadge key={c} code={c} variant="outline" className="hidden lg:inline-flex" />
                        ))}
                      </div>
                    </td>
                    <td className="px-3 py-3">
                      <MotivationBadge status={player.motivation_status as MotivationStatus} size="sm" />
                    </td>
                    <td className="hidden px-3 py-3 text-muted-foreground tabular-nums xl:table-cell">
                      {formatDate(player.motivation_assessed_at)}
                    </td>
                    <td className="px-3 py-3">
                      <LocationChip location={location} />
                    </td>
                    <td className="px-3 py-3 pr-5 text-right" onClick={(e) => e.stopPropagation()}>
                      <RowActions player={player} canEdit={canEdit} onDelete={setToDelete} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Karten auf dem Smartphone */}
          <ul className="flex flex-col gap-2 md:hidden">
            {rows.map(({ player, age, location }) => (
              <li key={player.id} className="flex items-center gap-3 rounded-2xl border border-border bg-card p-3">
                <GuardedLink href={`/spieler/${player.id}`} className="flex min-w-0 flex-1 items-center gap-3 rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-ring">
                  <PlayerAvatar firstName={player.first_name} lastName={player.last_name} photoUrl={photoUrl(player)} size="md" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-semibold">
                      {fullName(player)}
                      {player.jersey_number !== null && <span className="ml-1 text-xs text-muted-foreground">#{player.jersey_number}</span>}
                    </span>
                    <span className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                      <PositionBadge code={player.primary_position} />
                      {age !== null && <span>{age} J.</span>}
                      <LocationChip location={location} />
                    </span>
                  </span>
                </GuardedLink>
                <MotivationBadge status={player.motivation_status as MotivationStatus} size="sm" />
                <RowActions player={player} canEdit={canEdit} onDelete={setToDelete} />
              </li>
            ))}
          </ul>
        </>
      )}

      <DeletePlayerDialog player={toDelete} onOpenChange={(open) => !open && setToDelete(null)} />
    </div>
  );
}
