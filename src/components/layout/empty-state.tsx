import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
  compact,
}: {
  icon: LucideIcon;
  title: string;
  description?: ReactNode;
  action?: ReactNode;
  className?: string;
  compact?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-surface/50 text-center",
        compact ? "gap-2 px-4 py-6" : "gap-3 px-6 py-14",
        className,
      )}
    >
      <span
        className={cn(
          "flex items-center justify-center rounded-full bg-primary/10 text-primary ring-1 ring-primary/25",
          compact ? "size-10" : "size-14",
        )}
      >
        <Icon className={compact ? "size-5" : "size-6"} aria-hidden />
      </span>
      <div className="max-w-sm">
        <p className={cn("font-semibold", compact ? "text-sm" : "text-base")}>{title}</p>
        {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
      </div>
      {action && <div className="mt-1">{action}</div>}
    </div>
  );
}
