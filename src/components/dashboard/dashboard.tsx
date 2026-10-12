"use client";

import { useMemo } from "react";
import { Activity, Armchair, ArrowRight, Clock, LayoutGrid, UserPlus, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { GuardedLink } from "@/components/layout/guarded-link";
import { PageHeader } from "@/components/layout/page-header";
import { SectionCard } from "@/components/layout/section-card";
import { EmptyState } from "@/components/layout/empty-state";
import { PlayerAvatar } from "@/components/player/player-avatar";
import { MotivationBadge, MOTIVATION_STYLE } from "@/components/player/motivation-badge";
import { PositionBadge } from "@/components/player/position-badge";
import { NewPlayerButton } from "@/components/player/new-player-button";
import { useTeamData } from "@/components/providers/team-data-provider";
import { FIELD_POSITIONS } from "@/lib/domain/positions";
import { MOTIVATION, MOTIVATION_STATUSES, type MotivationStatus } from "@/lib/domain/motivation";
import { countFieldPlayers } from "@/lib/lineup/logic";
import { formatRelative, fullName } from "@/lib/domain/format";
import { cn } from "@/lib/utils";

function Kpi({ label, value, sub, icon }: { label: string; value: string; sub?: string; icon: React.ReactNode }) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-border bg-card p-5">
      <div className="flex items-start justify-between">
        <p className="text-xs font-semibold tracking-[0.14em] text-muted-foreground uppercase">{label}</p>
        <span className="text-primary">{icon}</span>
      </div>
      <p className="mt-3 text-4xl font-extrabold tabular-nums">{value}</p>
      {sub && <p className="mt-1 text-sm text-muted-foreground">{sub}</p>}
    </div>
  );
}

export function Dashboard() {
  const { team, players, playersById, lineup, photoUrl } = useTeamData();

  const stats = useMemo(() => {
    const fieldCount = countFieldPlayers(lineup);
    const benchCount = lineup.bench.length;
    const distribution = MOTIVATION_STATUSES.map((status) => ({
      status,
      count: players.filter((p) => p.motivation_status === status).length,
    }));
    const recent = [...players].sort((a, b) => b.updated_at.localeCompare(a.updated_at)).slice(0, 5);
    return { fieldCount, benchCount, unassigned: players.length - fieldCount - benchCount, distribution, recent };
  }, [players, lineup]);

  if (players.length === 0) {
    return (
      <>
        <PageHeader eyebrow={team.name} title="Dashboard" />
        <EmptyState
          icon={UserPlus}
          title="Willkommen bei COURT IQ"
          description="Deine Mannschaft ist angelegt. Starte mit dem ersten Spieler – danach füllen sich Spielfeld, Teamliste und dieses Dashboard."
          action={<NewPlayerButton />}
        />
      </>
    );
  }

  return (
    <>
      <PageHeader eyebrow={team.name} title="Dashboard" actions={<NewPlayerButton />} />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi label="Spieler" value={String(players.length)} sub="im Kader" icon={<Users className="size-5" />} />
        <Kpi label="Startaufstellung" value={`${stats.fieldCount}/7`} sub={stats.fieldCount === 7 ? "vollständig" : `${7 - stats.fieldCount} Position(en) frei`} icon={<LayoutGrid className="size-5" />} />
        <Kpi label="Ersatzbank" value={String(stats.benchCount)} sub="Spieler" icon={<Armchair className="size-5" />} />
        <Kpi label="Nicht eingeteilt" value={String(stats.unassigned)} sub="Spieler" icon={<Users className="size-5" />} />
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
        <SectionCard
          title="Aktuelle Aufstellung"
          icon={<LayoutGrid className="size-4" />}
          actions={
            <Button size="sm" variant="ghost" render={<GuardedLink href="/spielfeld" />} nativeButton={false}>
              Zum Spielfeld <ArrowRight />
            </Button>
          }
          bodyClassName="p-0"
        >
          <ul className="divide-y divide-border">
            {FIELD_POSITIONS.map((pos) => {
              const player = lineup.field[pos.code] ? playersById.get(lineup.field[pos.code]!) : undefined;
              return (
                <li key={pos.code} className="flex items-center gap-3 px-5 py-2.5">
                  <PositionBadge code={pos.code} className="w-11" />
                  {player ? (
                    <GuardedLink href={`/spieler/${player.id}`} className="flex min-w-0 flex-1 items-center gap-3 rounded-lg outline-none hover:text-primary focus-visible:ring-2 focus-visible:ring-ring">
                      <PlayerAvatar firstName={player.first_name} lastName={player.last_name} photoUrl={photoUrl(player)} size="sm" />
                      <span className="truncate font-medium">{fullName(player)}</span>
                    </GuardedLink>
                  ) : (
                    <span className="flex-1 text-sm text-muted-foreground">{pos.label} – frei</span>
                  )}
                </li>
              );
            })}
          </ul>
          <div className="border-t border-border px-5 py-3 text-sm">
            <span className="font-semibold">Bank:</span>{" "}
            {stats.benchCount === 0 ? (
              <span className="text-muted-foreground">leer</span>
            ) : (
              <span className="text-muted-foreground">
                {lineup.bench
                  .map((id) => playersById.get(id))
                  .filter(Boolean)
                  .map((p) => p!.last_name)
                  .join(", ")}
              </span>
            )}
          </div>
        </SectionCard>

        <div className="flex flex-col gap-6">
          <SectionCard title="Trainingsmotivation" icon={<Activity className="size-4" />}>
            <div className="flex h-3 overflow-hidden rounded-full bg-muted" role="img" aria-label={stats.distribution.map((d) => `${MOTIVATION[d.status].label}: ${d.count}`).join(", ")}>
              {stats.distribution
                .filter((d) => d.count > 0)
                .map((d) => (
                  <span key={d.status} className={cn("h-full", MOTIVATION_STYLE[d.status].dot)} style={{ width: `${(d.count / players.length) * 100}%` }} />
                ))}
            </div>
            <ul className="mt-4 grid grid-cols-2 gap-2">
              {stats.distribution.map((d) => (
                <li key={d.status} className="flex items-center justify-between rounded-xl bg-surface px-3 py-2.5 ring-1 ring-border">
                  <MotivationBadge status={d.status as MotivationStatus} size="sm" className="bg-transparent px-0 ring-0" />
                  <span className="text-lg font-bold tabular-nums">{d.count}</span>
                </li>
              ))}
            </ul>
          </SectionCard>

          <SectionCard title="Zuletzt bearbeitet" icon={<Clock className="size-4" />} bodyClassName="p-0">
            <ul className="divide-y divide-border">
              {stats.recent.map((p) => (
                <li key={p.id}>
                  <GuardedLink href={`/spieler/${p.id}`} className="flex items-center gap-3 px-5 py-3 transition-colors outline-none hover:bg-accent/40 focus-visible:bg-accent/40">
                    <PlayerAvatar firstName={p.first_name} lastName={p.last_name} photoUrl={photoUrl(p)} size="sm" />
                    <span className="min-w-0 flex-1 truncate font-medium">{fullName(p)}</span>
                    <span className="text-xs text-muted-foreground">{formatRelative(p.updated_at)}</span>
                  </GuardedLink>
                </li>
              ))}
            </ul>
          </SectionCard>
        </div>
      </div>
    </>
  );
}
