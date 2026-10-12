import { cn } from "@/lib/utils";
import { isFieldPositionCode, positionLabel } from "@/lib/domain/positions";

export function PositionBadge({
  code,
  variant = "solid",
  className,
}: {
  code: string;
  variant?: "solid" | "outline";
  className?: string;
}) {
  const label = isFieldPositionCode(code) ? positionLabel(code) : code;
  return (
    <span
      title={label}
      className={cn(
        "inline-flex h-6 min-w-9 items-center justify-center rounded-md px-1.5 text-xs font-bold tracking-wider tabular-nums",
        variant === "solid"
          ? "bg-primary/15 text-primary ring-1 ring-primary/30 ring-inset"
          : "text-muted-foreground ring-1 ring-border ring-inset",
        className,
      )}
    >
      <span aria-hidden>{code}</span>
      <span className="sr-only">{label}</span>
    </span>
  );
}
