import { CircleCheck, CircleHelp, CircleMinus, TriangleAlert } from "lucide-react";
import { cn } from "@/lib/utils";
import { MOTIVATION, type MotivationStatus } from "@/lib/domain/motivation";

/** Farbe + Symbol + Text: der Status ist auch ohne Farbwahrnehmung eindeutig. */
export const MOTIVATION_STYLE: Record<MotivationStatus, { dot: string; chip: string; Icon: typeof CircleCheck }> = {
  green: {
    dot: "bg-status-green",
    chip: "bg-status-green/12 text-status-green ring-status-green/35",
    Icon: CircleCheck,
  },
  yellow: {
    dot: "bg-status-yellow",
    chip: "bg-status-yellow/12 text-status-yellow ring-status-yellow/35",
    Icon: CircleMinus,
  },
  red: {
    dot: "bg-status-red",
    chip: "bg-status-red/12 text-status-red ring-status-red/35",
    Icon: TriangleAlert,
  },
  unrated: {
    dot: "bg-status-unrated",
    chip: "bg-muted text-muted-foreground ring-border",
    Icon: CircleHelp,
  },
};

export function MotivationBadge({
  status,
  size = "md",
  className,
}: {
  status: MotivationStatus;
  size?: "sm" | "md";
  className?: string;
}) {
  const meta = MOTIVATION[status];
  const style = MOTIVATION_STYLE[status];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full font-medium whitespace-nowrap ring-1 ring-inset",
        size === "sm" ? "px-2 py-0.5 text-xs" : "px-2.5 py-1 text-sm",
        style.chip,
        className,
      )}
      title={meta.description}
    >
      <style.Icon className={size === "sm" ? "size-3.5" : "size-4"} aria-hidden />
      <span>{meta.label}</span>
    </span>
  );
}

/** Kompakter Marker (z. B. am Spielerpunkt) mit Symbol statt nur Farbe. */
export function MotivationMarker({ status, className }: { status: MotivationStatus; className?: string }) {
  const style = MOTIVATION_STYLE[status];
  const meta = MOTIVATION[status];
  if (status === "unrated") return null;
  return (
    <span
      className={cn(
        "inline-flex size-5 items-center justify-center rounded-full text-[oklch(0.18_0.02_258)] ring-2 ring-background",
        style.dot,
        className,
      )}
      role="img"
      aria-label={`Motivation: ${meta.label}`}
    >
      <style.Icon className="size-3.5" aria-hidden />
    </span>
  );
}
