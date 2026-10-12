import { cn } from "@/lib/utils";
import { primaryPositionText } from "@/lib/domain/positions";

export function PositionBadge({
  code,
  variant = "solid",
  className,
}: {
  /** null = Position noch offen */
  code: string | null;
  variant?: "solid" | "outline";
  className?: string;
}) {
  const label = primaryPositionText(code);
  const open = !code;
  return (
    <span
      title={label}
      className={cn(
        "inline-flex h-6 min-w-9 items-center justify-center rounded-md px-1.5 text-xs font-bold tracking-wider tabular-nums",
        open
          ? "border border-dashed border-muted-foreground/50 font-semibold tracking-normal text-muted-foreground"
          : variant === "solid"
            ? "bg-primary/15 text-primary ring-1 ring-primary/30 ring-inset"
            : "text-muted-foreground ring-1 ring-border ring-inset",
        className,
      )}
    >
      <span aria-hidden>{open ? "offen" : code}</span>
      <span className="sr-only">{label}</span>
    </span>
  );
}
