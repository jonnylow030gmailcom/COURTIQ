import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Label } from "./label";

/** Beschriftung, Hinweis und Fehlermeldung eines Formularfelds – barrierefrei verknüpft. */
export function FormField({
  id,
  label,
  hint,
  error,
  required,
  children,
  className,
}: {
  id: string;
  label: ReactNode;
  hint?: ReactNode;
  error?: string;
  required?: boolean;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <Label htmlFor={id} className="text-sm font-medium">
        {label}
        {required && (
          <span className="text-primary" aria-hidden>
            *
          </span>
        )}
      </Label>
      {children}
      {hint && !error && (
        <p id={`${id}-hint`} className="text-xs text-muted-foreground">
          {hint}
        </p>
      )}
      {error && (
        <p id={`${id}-error`} role="alert" className="text-xs font-medium text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}

/** Natives Select im Stil der übrigen Eingaben – zuverlässig auf Touch-Geräten. */
export function NativeSelect({ className, ...props }: React.ComponentProps<"select">) {
  return (
    <select
      className={cn(
        "h-10 w-full appearance-none rounded-lg border border-input bg-transparent bg-[length:16px] bg-[right_0.6rem_center] bg-no-repeat pr-9 pl-3 text-sm transition-colors outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-50 aria-invalid:border-destructive dark:bg-input/30 [&>option]:bg-popover [&>option]:text-popover-foreground",
        "bg-[url('data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 24 24%22 fill=%22none%22 stroke=%22%238a94a6%22 stroke-width=%222%22><path d=%22m6 9 6 6 6-6%22/></svg>')]",
        className,
      )}
      {...props}
    />
  );
}
