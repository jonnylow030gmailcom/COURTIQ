"use client";

import { forwardRef, type ComponentPropsWithoutRef } from "react";
import { cn } from "@/lib/utils";
import { PlayerAvatar } from "@/components/player/player-avatar";
import { MotivationMarker } from "@/components/player/motivation-badge";
import type { PlayerRow } from "@/types/database";

interface PlayerTokenProps extends ComponentPropsWithoutRef<"button"> {
  player: PlayerRow;
  photoUrl: string | null;
  /** Positionskürzel als kleines Label (nur auf dem Feld) */
  code?: string;
  variant?: "field" | "bench" | "overlay";
  isDragging?: boolean;
  highlighted?: boolean;
}

/** Spielerpunkt: Foto bzw. Initialen, Trikotnummer, Motivationsmarker und Name. */
export const PlayerToken = forwardRef<HTMLButtonElement, PlayerTokenProps>(function PlayerToken(
  { player, photoUrl, code, variant = "field", isDragging, highlighted, className, ...props },
  ref,
) {
  const isField = variant === "field" || variant === "overlay";
  return (
    <button
      ref={ref}
      type="button"
      className={cn(
        "group/token relative flex touch-manipulation flex-col items-center gap-1 rounded-full outline-none select-none",
        "focus-visible:[&>.token-ring]:ring-4 focus-visible:[&>.token-ring]:ring-primary",
        isDragging && "opacity-30",
        className,
      )}
      {...props}
    >
      <span
        className={cn(
          "token-ring relative rounded-full p-[3px] transition-all duration-150",
          "bg-gradient-to-b from-primary to-primary/60 shadow-[0_6px_20px_-6px_rgba(0,0,0,0.6)]",
          "group-hover/token:scale-105 group-hover/token:shadow-[0_0_0_4px_color-mix(in_oklch,var(--primary)_35%,transparent)]",
          highlighted && "scale-110 shadow-[0_0_0_5px_color-mix(in_oklch,var(--primary)_45%,transparent)]",
          variant === "overlay" && "scale-110 shadow-2xl",
        )}
        style={isField ? { width: "var(--token-size)", height: "var(--token-size)" } : undefined}
      >
        <PlayerAvatar
          firstName={player.first_name}
          lastName={player.last_name}
          photoUrl={photoUrl}
          size={isField ? "md" : "lg"}
          className={cn("ring-2 ring-background", isField && "size-full! text-[length:calc(var(--token-size)*0.3)]!")}
        />
        {player.jersey_number !== null && (
          <span className="absolute -top-1 -right-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-background px-1 text-[0.65rem] font-bold text-foreground tabular-nums ring-1 ring-border">
            {player.jersey_number}
          </span>
        )}
        <MotivationMarker status={player.motivation_status} className="absolute -right-1 -bottom-1" />
        {code && (
          <span className="absolute -top-1 -left-1.5 rounded-md bg-sidebar px-1 py-px text-[0.6rem] font-bold tracking-wider text-sidebar-primary ring-1 ring-sidebar-border">
            {code}
          </span>
        )}
      </span>
      <span
        className={cn(
          "max-w-[7.5rem] truncate rounded-md px-1.5 py-0.5 text-[0.72rem] leading-tight font-semibold",
          isField ? "bg-sidebar/85 text-sidebar-foreground backdrop-blur-sm" : "text-foreground",
        )}
      >
        {player.last_name}
      </span>
    </button>
  );
});
