"use client";

import { useCallback, useMemo, useRef, useState, type CSSProperties, type ReactNode } from "react";
import {
  DndContext,
  DragOverlay,
  MouseSensor,
  TouchSensor,
  pointerWithin,
  rectIntersection,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type Announcements,
  type CollisionDetection,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { Armchair, Plus, UserPlus, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { GuardedLink } from "@/components/layout/guarded-link";
import { EmptyState } from "@/components/layout/empty-state";
import { useTeamData } from "@/components/providers/team-data-provider";
import { COURT_VIEWBOX, toViewboxPercent } from "@/lib/domain/court";
import { FIELD_POSITIONS, positionLabel, type FieldPosition, type FieldPositionCode, type LineupTarget } from "@/lib/domain/positions";
import { countFieldPlayers } from "@/lib/lineup/logic";
import { fullName } from "@/lib/domain/format";
import { cn } from "@/lib/utils";
import type { PlayerRow } from "@/types/database";
import { CourtMarkings } from "./court-markings";
import { PlayerToken } from "./player-token";
import { PlayerPickerDialog } from "./player-picker-dialog";
import { PlayerActionsDialog } from "./player-actions-dialog";
import { useAssignmentFlow } from "./use-assignment-flow";

type DropData =
  | { type: "slot"; code: FieldPositionCode }
  | { type: "bench" }
  | { type: "bench-item"; playerId: string }
  | { type: "roster" };

type DragData = { playerId: string };

const SPECIFIC_PREFIXES = ["slot:", "bench-item:"];

/** Bevorzugt konkrete Ziele (Feldposition, Bankplatz) vor den umgebenden Bereichen. */
const collisionDetection: CollisionDetection = (args) => {
  const hits = pointerWithin(args);
  if (hits.length > 0) {
    const specific = hits.find((h) => SPECIFIC_PREFIXES.some((p) => String(h.id).startsWith(p)));
    return [specific ?? hits[0]];
  }
  return rectIntersection(args);
};

function dropLabel(data: DropData | undefined, nameOf: (id: string) => string): string {
  if (!data) return "kein Ziel";
  if (data.type === "slot") return positionLabel(data.code);
  if (data.type === "roster") return "nicht eingeteilt";
  if (data.type === "bench-item") return `Bank neben ${nameOf(data.playerId)}`;
  return "Ersatzbank";
}

export function CourtBoard() {
  const { players, playersById, lineup, movePlayer, photoUrl, canEdit } = useTeamData();
  const flow = useAssignmentFlow();
  const [activePlayerId, setActivePlayerId] = useState<string | null>(null);
  const [pickerTarget, setPickerTarget] = useState<LineupTarget | null>(null);
  const [actionsPlayerId, setActionsPlayerId] = useState<string | null>(null);
  const lastDragEndRef = useRef(0);

  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 160, tolerance: 8 } }),
  );

  const nameOf = useCallback((id: string) => {
    const p = playersById.get(id);
    return p ? fullName(p) : "Spieler";
  }, [playersById]);

  const unassigned = useMemo(() => {
    const placed = new Set<string>([...Object.values(lineup.field), ...lineup.bench].filter(Boolean) as string[]);
    return players
      .filter((p) => !placed.has(p.id))
      .sort((a, b) => a.last_name.localeCompare(b.last_name, "de"));
  }, [players, lineup]);

  const benchPlayers = useMemo(
    () => lineup.bench.map((id) => playersById.get(id)).filter((p): p is PlayerRow => Boolean(p)),
    [lineup.bench, playersById],
  );

  const handleDragStart = (event: DragStartEvent) => {
    const data = event.active.data.current as DragData | undefined;
    setActivePlayerId(data?.playerId ?? null);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    lastDragEndRef.current = Date.now();
    setActivePlayerId(null);
    const drag = event.active.data.current as DragData | undefined;
    const drop = event.over?.data.current as DropData | undefined;
    if (!drag || !drop) return;
    const { playerId } = drag;

    switch (drop.type) {
      case "slot":
        // Explizite Geste: Tausch bzw. Verdrängter auf die Bank – eindeutig.
        if (lineup.field[drop.code] !== playerId) void movePlayer({ playerId, target: drop.code });
        return;
      case "bench":
        if (!lineup.bench.includes(playerId)) void movePlayer({ playerId, target: "BANK" });
        return;
      case "bench-item": {
        if (drop.playerId === playerId) return;
        const without = lineup.bench.filter((id) => id !== playerId);
        const index = without.indexOf(drop.playerId);
        void movePlayer({ playerId, target: "BANK", benchIndex: index < 0 ? null : index });
        return;
      }
      case "roster":
        void movePlayer({ playerId, target: "NONE" });
        return;
    }
  };

  /** Klicks direkt nach einem Drag ignorieren (sonst öffnet sich ein Dialog). */
  const guardClick = (fn: () => void) => () => {
    if (Date.now() - lastDragEndRef.current < 250) return;
    fn();
  };

  const announcements: Announcements = {
    onDragStart: ({ active }) => `${nameOf((active.data.current as DragData).playerId)} aufgenommen.`,
    onDragOver: ({ active, over }) =>
      `${nameOf((active.data.current as DragData).playerId)} über ${dropLabel(over?.data.current as DropData | undefined, nameOf)}.`,
    onDragEnd: ({ active, over }) =>
      over
        ? `${nameOf((active.data.current as DragData).playerId)} abgelegt: ${dropLabel(over.data.current as DropData, nameOf)}.`
        : "Verschieben abgebrochen.",
    onDragCancel: () => "Verschieben abgebrochen.",
  };

  const activePlayer = activePlayerId ? playersById.get(activePlayerId) : undefined;
  const isDragging = activePlayerId !== null;
  const fieldCount = countFieldPlayers(lineup);

  if (players.length === 0) {
    return (
      <EmptyState
        icon={UserPlus}
        title="Noch keine Spieler im Kader"
        description="Lege zuerst Spieler an. Danach kannst du sie hier auf die sieben Positionen und die Ersatzbank verteilen."
        action={
          <Button render={<GuardedLink href="/spieler/neu" />} nativeButton={false}>
            <UserPlus /> Ersten Spieler anlegen
          </Button>
        }
      />
    );
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={collisionDetection}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={() => setActivePlayerId(null)}
      // Nur ganz am Rand automatisch scrollen – sonst rutschen die oberen Positionen beim Ziehen weg.
      autoScroll={{ threshold: { x: 0, y: 0.08 }, acceleration: 6 }}
      accessibility={{
        announcements,
        screenReaderInstructions: {
          draggable:
            "Zum Verschieben mit der Maus ziehen bzw. auf Touch-Geräten kurz gedrückt halten und ziehen. Mit Enter öffnen sich die Aktionen, dort ist das Verschieben auch per Tastatur möglich.",
        },
      }}
    >
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
        <section aria-label="Spielfeld" className="min-w-0">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2 text-sm">
            <p className="font-semibold">
              Startaufstellung <span className="ml-1 text-muted-foreground tabular-nums">{fieldCount}/7</span>
            </p>
            <p className="text-xs text-muted-foreground">
              {canEdit
                ? "Ziehen zum Verschieben · Tippen für Aktionen"
                : "Nur Ansicht – Änderungen sind Trainer:innen vorbehalten"}
            </p>
          </div>
          <div
            className="@container relative mx-auto w-full overflow-hidden rounded-[1.75rem] bg-court shadow-[inset_0_0_0_1px_color-mix(in_oklch,var(--court-line)_12%,transparent),0_24px_60px_-28px_rgba(0,0,0,0.6)]"
            style={{
              aspectRatio: `${COURT_VIEWBOX.width} / ${COURT_VIEWBOX.height}`,
              maxWidth: `min(100%, calc((100dvh - 10rem) * ${COURT_VIEWBOX.width / COURT_VIEWBOX.height}))`,
              ["--token-size" as string]: "clamp(44px, 11.5cqw, 80px)",
            } as CSSProperties}
          >
            <CourtMarkings />
            {FIELD_POSITIONS.map((pos) => (
              <FieldSlot
                key={pos.code}
                position={pos}
                player={lineup.field[pos.code] ? playersById.get(lineup.field[pos.code]!) : undefined}
                photoUrl={photoUrl}
                isDragging={isDragging}
                activePlayerId={activePlayerId}
                canEdit={canEdit}
                onEmptyClick={guardClick(() => setPickerTarget(pos.code))}
                onPlayerClick={(id) => guardClick(() => setActionsPlayerId(id))()}
              />
            ))}
          </div>
        </section>

        <aside className="flex min-w-0 flex-col gap-6" aria-label="Ersatzbank und Kader">
          <BenchZone
            players={benchPlayers}
            photoUrl={photoUrl}
            isDragging={isDragging}
            activePlayerId={activePlayerId}
            canEdit={canEdit}
            onAdd={() => setPickerTarget("BANK")}
            onPlayerClick={(id) => guardClick(() => setActionsPlayerId(id))()}
          />
          <RosterZone
            players={unassigned}
            photoUrl={photoUrl}
            isDragging={isDragging}
            activePlayerId={activePlayerId}
            canEdit={canEdit}
            onPlayerClick={(id) => guardClick(() => setActionsPlayerId(id))()}
          />
        </aside>
      </div>

      <DragOverlay dropAnimation={{ duration: 160, easing: "cubic-bezier(0.2, 0, 0, 1)" }}>
        {activePlayer ? (
          <div style={{ ["--token-size" as string]: "68px" } as CSSProperties}>
            <PlayerToken player={activePlayer} photoUrl={photoUrl(activePlayer)} variant="overlay" tabIndex={-1} />
          </div>
        ) : null}
      </DragOverlay>

      <PlayerPickerDialog
        open={pickerTarget !== null}
        target={pickerTarget}
        onOpenChange={(open) => !open && setPickerTarget(null)}
        onSelect={(playerId) => {
          const target = pickerTarget;
          setPickerTarget(null);
          if (target) void flow.request(playerId, target);
        }}
      />
      <PlayerActionsDialog
        playerId={actionsPlayerId}
        onOpenChange={(open) => !open && setActionsPlayerId(null)}
        onMove={(playerId, target) => {
          setActionsPlayerId(null);
          void flow.request(playerId, target);
        }}
        onReplace={(target) => {
          setActionsPlayerId(null);
          setPickerTarget(target);
        }}
      />
      {flow.dialog}
    </DndContext>
  );
}

// ---------------------------------------------------------------------------
// Bausteine
// ---------------------------------------------------------------------------

function DraggablePlayer({
  player,
  photoUrl,
  code,
  variant,
  canEdit,
  onClick,
  activePlayerId,
  highlighted,
}: {
  player: PlayerRow;
  photoUrl: string | null;
  code?: string;
  variant: "field" | "bench";
  canEdit: boolean;
  onClick: () => void;
  activePlayerId: string | null;
  highlighted?: boolean;
}) {
  const { setNodeRef, attributes, listeners } = useDraggable({
    id: `player:${player.id}`,
    data: { playerId: player.id } satisfies DragData,
    disabled: !canEdit,
  });
  return (
    <PlayerToken
      ref={setNodeRef}
      player={player}
      photoUrl={photoUrl}
      code={code}
      variant={variant}
      isDragging={activePlayerId === player.id}
      highlighted={highlighted}
      {...attributes}
      {...listeners}
      aria-label={`${fullName(player)}${code ? `, ${positionLabel(code as FieldPositionCode)}` : ""}. Enter für Aktionen.`}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          onClick();
        }
      }}
    />
  );
}

function FieldSlot({
  position,
  player,
  photoUrl,
  isDragging,
  activePlayerId,
  canEdit,
  onEmptyClick,
  onPlayerClick,
}: {
  position: FieldPosition;
  player: PlayerRow | undefined;
  photoUrl: (p: PlayerRow) => string | null;
  isDragging: boolean;
  activePlayerId: string | null;
  canEdit: boolean;
  onEmptyClick: () => void;
  onPlayerClick: (playerId: string) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: `slot:${position.code}`,
    data: { type: "slot", code: position.code } satisfies DropData,
    disabled: !canEdit,
  });
  const { left, top } = toViewboxPercent(position.x, position.y);
  const isSource = player && activePlayerId === player.id;

  return (
    <div
      ref={setNodeRef}
      className="absolute flex -translate-x-1/2 -translate-y-1/2 items-start justify-center"
      style={{ left: `${left}%`, top: `${top}%`, width: "calc(var(--token-size) * 1.7)", minHeight: "calc(var(--token-size) * 1.45)" }}
    >
      {/* Ziel-Hinweis beim Ziehen */}
      {isDragging && !isSource && (
        <span
          aria-hidden
          className={cn(
            "pointer-events-none absolute top-0 left-1/2 -translate-x-1/2 rounded-full transition-all duration-150",
            isOver
              ? "bg-primary/30 shadow-[0_0_0_4px_var(--primary),0_0_32px_6px_color-mix(in_oklch,var(--primary)_60%,transparent)]"
              : "shadow-[0_0_0_2px_color-mix(in_oklch,var(--primary)_70%,transparent)] animate-pulse",
          )}
          style={{ width: "calc(var(--token-size) + 6px)", height: "calc(var(--token-size) + 6px)", marginTop: "-3px" }}
        />
      )}

      {player ? (
        <DraggablePlayer
          player={player}
          photoUrl={photoUrl(player)}
          code={position.code}
          variant="field"
          canEdit={canEdit}
          activePlayerId={activePlayerId}
          highlighted={isOver && !isSource}
          onClick={() => onPlayerClick(player.id)}
        />
      ) : (
        <button
          type="button"
          onClick={canEdit ? onEmptyClick : undefined}
          disabled={!canEdit}
          aria-label={`${position.label} – frei. ${canEdit ? "Spieler zuordnen" : ""}`}
          className="group/slot flex touch-manipulation flex-col items-center gap-1 rounded-full outline-none"
        >
          <span
            className={cn(
              "flex items-center justify-center rounded-full border-2 border-dashed border-court-line/55 bg-[color-mix(in_oklch,var(--court-floor)_88%,var(--court-line))] text-court-line transition-all duration-150",
              canEdit && "group-hover/slot:scale-105 group-hover/slot:border-primary group-hover/slot:bg-primary/20 group-hover/slot:text-primary",
              "group-focus-visible/slot:ring-4 group-focus-visible/slot:ring-primary",
              isOver && "scale-110 border-primary bg-primary/25 text-primary",
            )}
            style={{ width: "var(--token-size)", height: "var(--token-size)" }}
          >
            <span className="flex flex-col items-center leading-none">
              <span className="text-[length:calc(var(--token-size)*0.26)] font-extrabold tracking-wider">{position.code}</span>
              {canEdit && <Plus className="mt-0.5 size-[calc(var(--token-size)*0.24)] opacity-80" aria-hidden />}
            </span>
          </span>
          {/* Auf kleinen Feldern reicht das Kürzel im Punkt – sonst überlappen die Beschriftungen */}
          <span className="rounded-md bg-sidebar/70 px-1.5 py-0.5 text-[0.68rem] font-semibold whitespace-nowrap text-sidebar-muted @max-md:hidden">
            {position.label}
          </span>
        </button>
      )}
    </div>
  );
}

function ZoneHeader({ icon, title, count, action }: { icon: ReactNode; title: string; count: number; action?: ReactNode }) {
  return (
    <div className="mb-3 flex items-center justify-between gap-2">
      <h2 className="flex items-center gap-2 text-sm font-semibold">
        <span className="text-primary">{icon}</span>
        {title}
        <span className="rounded-full bg-secondary px-2 py-0.5 text-xs font-bold text-secondary-foreground tabular-nums" aria-label={`${count} Spieler`}>
          {count}
        </span>
      </h2>
      {action}
    </div>
  );
}

function BenchItem({
  player,
  photoUrl,
  canEdit,
  activePlayerId,
  isDragging,
  onClick,
}: {
  player: PlayerRow;
  photoUrl: string | null;
  canEdit: boolean;
  activePlayerId: string | null;
  isDragging: boolean;
  onClick: () => void;
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: `bench-item:${player.id}`,
    data: { type: "bench-item", playerId: player.id } satisfies DropData,
    disabled: !canEdit,
  });
  return (
    <li
      ref={setNodeRef}
      className={cn(
        "relative flex w-[5.5rem] shrink-0 snap-start justify-center rounded-2xl py-2 transition-colors",
        isOver && activePlayerId !== player.id && "bg-primary/10",
      )}
    >
      {isOver && isDragging && activePlayerId !== player.id && (
        <span aria-hidden className="absolute top-3 bottom-6 -left-1 w-1 rounded-full bg-primary" />
      )}
      <DraggablePlayer
        player={player}
        photoUrl={photoUrl}
        variant="bench"
        canEdit={canEdit}
        activePlayerId={activePlayerId}
        onClick={onClick}
      />
    </li>
  );
}

function BenchZone({
  players,
  photoUrl,
  isDragging,
  activePlayerId,
  canEdit,
  onAdd,
  onPlayerClick,
}: {
  players: PlayerRow[];
  photoUrl: (p: PlayerRow) => string | null;
  isDragging: boolean;
  activePlayerId: string | null;
  canEdit: boolean;
  onAdd: () => void;
  onPlayerClick: (playerId: string) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: "bench", data: { type: "bench" } satisfies DropData, disabled: !canEdit });
  return (
    <section
      ref={setNodeRef}
      aria-label="Ersatzbank"
      className={cn(
        "rounded-2xl border bg-card p-4 transition-all duration-150",
        isDragging ? "border-primary/60 border-dashed" : "border-border",
        isOver && "bg-primary/[0.07] shadow-[0_0_0_3px_color-mix(in_oklch,var(--primary)_40%,transparent)]",
      )}
    >
      <ZoneHeader
        icon={<Armchair className="size-4" aria-hidden />}
        title="Ersatzbank"
        count={players.length}
        action={
          canEdit ? (
            <Button size="sm" variant="outline" onClick={onAdd}>
              <Plus /> Hinzufügen
            </Button>
          ) : undefined
        }
      />
      {players.length === 0 ? (
        <div className="flex min-h-28 flex-col items-center justify-center rounded-xl border border-dashed border-border px-4 text-center text-sm text-muted-foreground">
          <p className="font-medium text-foreground">Die Bank ist leer</p>
          <p className="mt-0.5 text-xs">{canEdit ? "Spieler hierher ziehen oder über „Hinzufügen“ auswählen." : "Noch keine Bankspieler eingeteilt."}</p>
        </div>
      ) : (
        <ul className="-mx-1 flex snap-x gap-1 overflow-x-auto px-1 pb-1 xl:flex-wrap xl:overflow-visible">
          {players.map((p) => (
            <BenchItem
              key={p.id}
              player={p}
              photoUrl={photoUrl(p)}
              canEdit={canEdit}
              activePlayerId={activePlayerId}
              isDragging={isDragging}
              onClick={() => onPlayerClick(p.id)}
            />
          ))}
        </ul>
      )}
    </section>
  );
}

function RosterZone({
  players,
  photoUrl,
  isDragging,
  activePlayerId,
  canEdit,
  onPlayerClick,
}: {
  players: PlayerRow[];
  photoUrl: (p: PlayerRow) => string | null;
  isDragging: boolean;
  activePlayerId: string | null;
  canEdit: boolean;
  onPlayerClick: (playerId: string) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: "roster", data: { type: "roster" } satisfies DropData, disabled: !canEdit });
  return (
    <section
      ref={setNodeRef}
      aria-label="Nicht eingeteilte Spieler"
      className={cn(
        "rounded-2xl border bg-surface p-4 transition-all duration-150",
        isDragging ? "border-dashed border-muted-foreground/50" : "border-border",
        isOver && "border-destructive/60 bg-destructive/[0.06]",
      )}
    >
      <ZoneHeader icon={<Users className="size-4" aria-hidden />} title="Nicht eingeteilt" count={players.length} />
      {isDragging && canEdit && (
        <p className="mb-2 text-xs font-medium text-muted-foreground">Hier ablegen, um den Spieler aus der Aufstellung zu nehmen.</p>
      )}
      {players.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border px-4 py-5 text-center text-sm text-muted-foreground">
          Alle Spieler sind eingeteilt.
        </p>
      ) : (
        <ul className="-mx-1 flex snap-x gap-1 overflow-x-auto px-1 pb-1 xl:flex-wrap xl:overflow-visible">
          {players.map((p) => (
            <li key={p.id} className="flex w-[5.5rem] shrink-0 snap-start justify-center py-2">
              <DraggablePlayer
                player={p}
                photoUrl={photoUrl(p)}
                variant="bench"
                canEdit={canEdit}
                activePlayerId={activePlayerId}
                onClick={() => onPlayerClick(p.id)}
              />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
