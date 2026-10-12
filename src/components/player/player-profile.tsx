"use client";

import { useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import {
  Activity,
  ArrowLeft,
  Camera,
  ChevronDown,
  LayoutGrid,
  NotebookPen,
  Pencil,
  Shield,
  Sparkles,
  Swords,
  Trash2,
  UserRound,
  UserX,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { GuardedLink } from "@/components/layout/guarded-link";
import { EmptyState } from "@/components/layout/empty-state";
import { useTeamData, type PhotoChange } from "@/components/providers/team-data-provider";
import { useAssignmentFlow } from "@/components/court/use-assignment-flow";
import { calculateAge, formatDate, formatDateTime, fullName } from "@/lib/domain/format";
import { FIELD_POSITIONS, positionLabel, primaryPositionText } from "@/lib/domain/positions";
import { MOTIVATION, type MotivationStatus } from "@/lib/domain/motivation";
import { THROWING_HAND_LABEL } from "@/lib/validation/player";
import { toUserMessage } from "@/lib/data/errors";
import { cn } from "@/lib/utils";
import type { PlayerRow } from "@/types/database";
import { PlayerAvatar } from "./player-avatar";
import { MotivationBadge, MOTIVATION_STYLE } from "./motivation-badge";
import { MotivationPicker } from "./motivation-picker";
import { PositionBadge } from "./position-badge";
import { PhotoField } from "./photo-field";
import { DeletePlayerDialog } from "./delete-player-dialog";

function Section({ icon, title, children, action }: { icon: ReactNode; title: string; children: ReactNode; action?: ReactNode }) {
  return (
    <section className="rounded-2xl border border-border bg-card p-5 sm:p-6">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="flex items-center gap-2.5 text-base font-bold">
          <span className="flex size-8 items-center justify-center rounded-lg bg-primary/12 text-primary ring-1 ring-primary/25">{icon}</span>
          {title}
        </h2>
        {action}
      </div>
      {children}
    </section>
  );
}

function Empty({ children }: { children: ReactNode }) {
  return <p className="rounded-xl border border-dashed border-border px-4 py-4 text-sm text-muted-foreground">{children}</p>;
}

function Tags({ items, tone = "primary" }: { items: string[]; tone?: "primary" | "neutral" | "warn" }) {
  if (items.length === 0) return null;
  return (
    <ul className="flex flex-wrap gap-1.5">
      {items.map((t) => (
        <li
          key={t}
          className={cn(
            "rounded-md px-2.5 py-1 text-sm font-medium ring-1 ring-inset",
            tone === "primary" && "bg-primary/12 text-primary ring-primary/25",
            tone === "neutral" && "bg-secondary text-secondary-foreground ring-border",
            tone === "warn" && "bg-status-yellow/10 text-foreground ring-status-yellow/40",
          )}
        >
          {t}
        </li>
      ))}
    </ul>
  );
}

function Prose({ text }: { text: string | null }) {
  if (!text) return null;
  return <p className="text-sm leading-relaxed whitespace-pre-line text-foreground/90">{text}</p>;
}

function Fact({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="rounded-xl bg-surface px-4 py-3 ring-1 ring-border">
      <dt className="text-[0.68rem] font-semibold tracking-[0.14em] text-muted-foreground uppercase">{label}</dt>
      <dd className="mt-1 text-lg font-bold tabular-nums">{value}</dd>
    </div>
  );
}

export function PlayerProfile({ playerId }: { playerId: string }) {
  const { playersById, photoUrl, locate, canEdit } = useTeamData();
  const player = playersById.get(playerId);

  if (!player) {
    return (
      <EmptyState
        icon={UserX}
        title="Spieler nicht gefunden"
        description="Dieser Spieler existiert nicht (mehr) oder du hast keinen Zugriff."
        action={
          <Button render={<GuardedLink href="/team" />} nativeButton={false}>
            Zur Teamübersicht
          </Button>
        }
      />
    );
  }
  return <ProfileContent player={player} photo={photoUrl(player)} location={locate(player.id)} canEdit={canEdit} />;
}

function ProfileContent({
  player,
  photo,
  location,
  canEdit,
}: {
  player: PlayerRow;
  photo: string | null;
  location: ReturnType<ReturnType<typeof useTeamData>["locate"]>;
  canEdit: boolean;
}) {
  const router = useRouter();
  const flow = useAssignmentFlow();
  const [photoOpen, setPhotoOpen] = useState(false);
  const [motivationOpen, setMotivationOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const age = calculateAge(player.birth_date);
  const status = player.motivation_status as MotivationStatus;

  const locationText =
    location.kind === "field"
      ? `Startaufstellung · ${positionLabel(location.code)}`
      : location.kind === "bench"
        ? "Ersatzbank"
        : "Nicht eingeteilt";

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center gap-2">
        <Button variant="ghost" size="sm" render={<GuardedLink href="/team" />} nativeButton={false}>
          <ArrowLeft /> Teamübersicht
        </Button>
        <Button variant="ghost" size="sm" render={<GuardedLink href="/spielfeld" />} nativeButton={false}>
          <LayoutGrid /> Spielfeld
        </Button>
      </div>

      {/* Kopfbereich */}
      <section className="relative overflow-hidden rounded-3xl border border-border bg-card">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(90%_120%_at_0%_0%,color-mix(in_oklch,var(--primary)_20%,transparent),transparent_60%)]"
        />
        {player.jersey_number !== null && (
          <span
            aria-hidden
            className="pointer-events-none absolute -top-6 right-4 text-[9rem] leading-none font-black text-foreground/[0.05] tabular-nums select-none sm:text-[12rem]"
          >
            {player.jersey_number}
          </span>
        )}
        <div className="relative flex flex-col gap-6 p-6 sm:flex-row sm:items-end sm:p-8">
          <div className="relative w-fit">
            <PlayerAvatar
              firstName={player.first_name}
              lastName={player.last_name}
              photoUrl={photo}
              size="xl"
              className="rounded-3xl ring-4 ring-background [&>img]:rounded-3xl"
            />
            {canEdit && (
              <button
                type="button"
                onClick={() => setPhotoOpen(true)}
                className="absolute -right-2 -bottom-2 flex size-10 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg ring-4 ring-card transition-transform hover:scale-105 focus-visible:ring-ring focus-visible:outline-none"
                aria-label="Foto ändern"
              >
                <Camera className="size-4" />
              </button>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <PositionBadge code={player.primary_position} className="h-7 px-2 text-sm" />
              {player.alternative_positions.map((c) => (
                <PositionBadge key={c} code={c} variant="outline" />
              ))}
            </div>
            <h1 className="mt-2 text-3xl font-extrabold sm:text-4xl">
              {player.first_name} <span className="text-primary">{player.last_name}</span>
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {primaryPositionText(player.primary_position)} · {locationText}
            </p>
            <div className="mt-3">
              <MotivationBadge status={status} />
            </div>
          </div>
          {canEdit && (
            <div className="flex flex-wrap gap-2 sm:flex-col sm:items-stretch">
              <Button render={<GuardedLink href={`/spieler/${player.id}/bearbeiten`} />} nativeButton={false}>
                <Pencil /> Bearbeiten
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger render={<Button variant="outline" />}>
                  <LayoutGrid /> Aufstellung <ChevronDown />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-60">
                  <DropdownMenuGroup>
                    <DropdownMenuLabel>Zuordnen zu</DropdownMenuLabel>
                    {FIELD_POSITIONS.map((p) => (
                      <DropdownMenuItem
                        key={p.code}
                        disabled={location.kind === "field" && location.code === p.code}
                        onClick={() => void flow.request(player.id, p.code)}
                      >
                        <span className="w-8 font-bold">{p.code}</span> {p.label}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuGroup>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem disabled={location.kind === "bench"} onClick={() => void flow.request(player.id, "BANK")}>
                    Auf die Ersatzbank
                  </DropdownMenuItem>
                  <DropdownMenuItem disabled={location.kind === "none"} onClick={() => void flow.request(player.id, "NONE")}>
                    Aus Aufstellung nehmen
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <Button variant="destructive" onClick={() => setDeleteOpen(true)}>
                <Trash2 /> Löschen
              </Button>
            </div>
          )}
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <Section icon={<UserRound className="size-4" />} title="Profil">
          <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <Fact label="Alter" value={age !== null ? `${age} J.` : "–"} />
            <Fact label="Geburtsdatum" value={<span className="text-base">{formatDate(player.birth_date)}</span>} />
            <Fact label="Trikot" value={player.jersey_number !== null ? `#${player.jersey_number}` : "–"} />
            <Fact label="Größe" value={player.height_cm ? `${player.height_cm} cm` : "–"} />
            <Fact label="Wurfhand" value={<span className="text-base">{player.throwing_hand ? THROWING_HAND_LABEL[player.throwing_hand] : "–"}</span>} />
            <Fact label="Aufstellung" value={<span className="text-base">{location.kind === "field" ? location.code : location.kind === "bench" ? "Bank" : "–"}</span>} />
          </dl>
        </Section>

        <Section
          icon={<Activity className="size-4" />}
          title="Trainingsmotivation"
          action={
            canEdit ? (
              <Button size="sm" variant="outline" onClick={() => setMotivationOpen(true)}>
                Bewerten
              </Button>
            ) : undefined
          }
        >
          <div className="flex items-start gap-4">
            <span
              className={cn(
                "flex size-14 shrink-0 items-center justify-center rounded-2xl text-[oklch(0.18_0.02_258)]",
                MOTIVATION_STYLE[status].dot,
              )}
              aria-hidden
            >
              {(() => {
                const Icon = MOTIVATION_STYLE[status].Icon;
                return <Icon className="size-7" />;
              })()}
            </span>
            <div className="min-w-0">
              <p className="text-lg font-bold">{MOTIVATION[status].label}</p>
              <p className="text-sm text-muted-foreground">{MOTIVATION[status].description}</p>
              <p className="mt-2 text-xs text-muted-foreground">
                Letzte Bewertung: <span className="font-medium text-foreground">{formatDateTime(player.motivation_assessed_at)}</span>
              </p>
            </div>
          </div>
          {player.motivation_note ? (
            <div className="mt-4 rounded-xl bg-surface p-4 ring-1 ring-border">
              <p className="mb-1 text-xs font-semibold tracking-[0.12em] text-muted-foreground uppercase">Begründung</p>
              <Prose text={player.motivation_note} />
            </div>
          ) : null}
        </Section>

        <Section icon={<Sparkles className="size-4" />} title="Stärken und Schwächen">
          {player.strengths.length + player.weaknesses.length === 0 && !player.strengths_notes && !player.weaknesses_notes ? (
            <Empty>Noch keine Stärken oder Schwächen erfasst.</Empty>
          ) : (
            <div className="grid gap-5 sm:grid-cols-2">
              <div className="space-y-2">
                <h3 className="text-sm font-semibold text-status-green">Stärken</h3>
                <Tags items={player.strengths} />
                <Prose text={player.strengths_notes} />
                {player.strengths.length === 0 && !player.strengths_notes && <p className="text-sm text-muted-foreground">–</p>}
              </div>
              <div className="space-y-2">
                <h3 className="text-sm font-semibold text-status-yellow">Schwächen</h3>
                <Tags items={player.weaknesses} tone="warn" />
                <Prose text={player.weaknesses_notes} />
                {player.weaknesses.length === 0 && !player.weaknesses_notes && <p className="text-sm text-muted-foreground">–</p>}
              </div>
            </div>
          )}
        </Section>

        <Section icon={<Swords className="size-4" />} title="Angriffsverhalten">
          {player.attack_traits.length === 0 && !player.attack_behavior ? (
            <Empty>Noch keine Beobachtungen zum Angriff.</Empty>
          ) : (
            <div className="space-y-3">
              <Tags items={player.attack_traits} />
              <Prose text={player.attack_behavior} />
            </div>
          )}
        </Section>

        <Section icon={<Shield className="size-4" />} title="Abwehrverhalten">
          {player.defense_traits.length === 0 && !player.defense_behavior && !player.tactical_notes ? (
            <Empty>Noch keine Beobachtungen zur Abwehr.</Empty>
          ) : (
            <div className="space-y-3">
              <Tags items={player.defense_traits} />
              <Prose text={player.defense_behavior} />
              {player.tactical_notes && (
                <div className="rounded-xl bg-surface p-4 ring-1 ring-border">
                  <p className="mb-1 text-xs font-semibold tracking-[0.12em] text-muted-foreground uppercase">Taktische Besonderheiten</p>
                  <Prose text={player.tactical_notes} />
                </div>
              )}
            </div>
          )}
        </Section>

        <Section icon={<NotebookPen className="size-4" />} title="Trainer-Notizen">
          {!player.coach_notes && !player.general_notes ? (
            <Empty>Noch keine Notizen.</Empty>
          ) : (
            <div className="space-y-4">
              {player.coach_notes && (
                <div>
                  <h3 className="mb-1 text-sm font-semibold">Individuelle Hinweise</h3>
                  <Prose text={player.coach_notes} />
                </div>
              )}
              {player.general_notes && (
                <div>
                  <h3 className="mb-1 text-sm font-semibold">Allgemein</h3>
                  <Prose text={player.general_notes} />
                </div>
              )}
            </div>
          )}
        </Section>
      </div>

      <p className="text-xs text-muted-foreground">
        Angelegt am {formatDateTime(player.created_at)} · zuletzt geändert am {formatDateTime(player.updated_at)}
      </p>

      {flow.dialog}
      <PhotoDialog open={photoOpen} onOpenChange={setPhotoOpen} player={player} photo={photo} />
      <MotivationDialog open={motivationOpen} onOpenChange={setMotivationOpen} player={player} />
      <DeletePlayerDialog
        player={deleteOpen ? player : null}
        onOpenChange={setDeleteOpen}
        onDeleted={() => router.push("/team")}
      />
    </div>
  );
}

function PhotoDialog({ open, onOpenChange, player, photo }: { open: boolean; onOpenChange: (o: boolean) => void; player: PlayerRow; photo: string | null }) {
  const { changePhoto } = useTeamData();
  const [change, setChange] = useState<PhotoChange>({ kind: "keep" });
  const [busy, setBusy] = useState(false);

  const save = async () => {
    setBusy(true);
    try {
      await changePhoto(player.id, change);
      toast.success(change.kind === "remove" ? "Foto entfernt." : "Foto gespeichert.");
      setChange({ kind: "keep" });
      onOpenChange(false);
    } catch (error) {
      toast.error(toUserMessage(error, "Das Foto konnte nicht gespeichert werden."));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (busy) return;
        if (!o) setChange({ kind: "keep" });
        onOpenChange(o);
      }}
    >
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold">Foto ändern</DialogTitle>
          <DialogDescription>{fullName(player)}</DialogDescription>
        </DialogHeader>
        <PhotoField currentUrl={photo} value={change} onChange={setChange} firstName={player.first_name} lastName={player.last_name} disabled={busy} />
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>
            Abbrechen
          </Button>
          <Button onClick={() => void save()} disabled={busy || change.kind === "keep"}>
            {busy ? "Wird hochgeladen…" : "Speichern"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function MotivationDialog({ open, onOpenChange, player }: { open: boolean; onOpenChange: (o: boolean) => void; player: PlayerRow }) {
  const { updateMotivation } = useTeamData();
  const [status, setStatus] = useState<MotivationStatus>(player.motivation_status as MotivationStatus);
  const [note, setNote] = useState(player.motivation_note ?? "");
  const [busy, setBusy] = useState(false);

  const save = async () => {
    setBusy(true);
    try {
      await updateMotivation(player.id, status, note);
      toast.success(`Motivation: ${MOTIVATION[status].label}`);
      onOpenChange(false);
    } catch (error) {
      toast.error(toUserMessage(error, "Die Bewertung konnte nicht gespeichert werden."));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (busy) return;
        if (o) {
          setStatus(player.motivation_status as MotivationStatus);
          setNote(player.motivation_note ?? "");
        }
        onOpenChange(o);
      }}
    >
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold">Trainingsmotivation bewerten</DialogTitle>
          <DialogDescription>
            Interne Beobachtung für {fullName(player)}. Wird ausschließlich manuell gesetzt.
          </DialogDescription>
        </DialogHeader>
        <MotivationPicker value={status} onChange={setStatus} name="motivation-dialog" disabled={busy} />
        <div className="grid gap-1.5">
          <label htmlFor="motivation-note-dialog" className="text-sm font-medium">
            Begründung (optional)
          </label>
          <Textarea id="motivation-note-dialog" rows={3} value={note} maxLength={2000} onChange={(e) => setNote(e.target.value)} />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>
            Abbrechen
          </Button>
          <Button onClick={() => void save()} disabled={busy}>
            {busy ? "Wird gespeichert…" : "Bewertung speichern"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
