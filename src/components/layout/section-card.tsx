import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function SectionCard({
  title,
  icon,
  actions,
  children,
  className,
  bodyClassName,
  id,
}: {
  title?: ReactNode;
  icon?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
  id?: string;
}) {
  return (
    <section
      id={id}
      className={cn("rounded-2xl border border-border bg-card text-card-foreground shadow-sm", className)}
    >
      {(title || actions) && (
        <div className="flex items-center justify-between gap-3 border-b border-border px-5 py-3.5">
          <h2 className="flex items-center gap-2 text-sm font-semibold tracking-wide">
            {icon && <span className="text-primary">{icon}</span>}
            {title}
          </h2>
          {actions}
        </div>
      )}
      <div className={cn("p-5", bodyClassName)}>{children}</div>
    </section>
  );
}
