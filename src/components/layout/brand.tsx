/* eslint-disable @next/next/no-img-element -- kleines statisches Logo, kein Bildproxy nötig */
import { cn } from "@/lib/utils";

/**
 * Elitehandball-Logo (Original, public/elitehandball-logo.png, 640 × 317).
 * Das „EH“-Monogramm ist weiß – das Logo nur auf dunklen Flächen verwenden.
 */
export function ElitehandballLogo({ className, decorative = true }: { className?: string; decorative?: boolean }) {
  return (
    <img
      src="/elitehandball-logo.png"
      width={640}
      height={317}
      alt={decorative ? "" : "Elitehandball"}
      aria-hidden={decorative || undefined}
      draggable={false}
      className={cn("h-8 w-auto shrink-0 select-none", className)}
    />
  );
}

/** „COURT IQ by Elitehandball“ – für dunkle Flächen (Navigation, Anmeldeseite). */
export function BrandWordmark({ className, compact }: { className?: string; compact?: boolean }) {
  return (
    <span className={cn("flex items-center gap-3", className)}>
      <ElitehandballLogo className={compact ? "h-6" : "h-9"} decorative={false} />
      <span className="flex flex-col leading-none">
        <span className={cn("font-extrabold tracking-[0.14em] text-sidebar-foreground", compact ? "text-sm" : "text-[1.05rem]")}>
          COURT<span className="text-sidebar-primary"> IQ</span>
        </span>
        <span
          className={cn(
            "mt-1 font-semibold tracking-[0.2em] text-sidebar-muted uppercase",
            compact ? "text-[0.5rem]" : "text-[0.58rem]",
          )}
        >
          by Elitehandball
        </span>
      </span>
    </span>
  );
}
