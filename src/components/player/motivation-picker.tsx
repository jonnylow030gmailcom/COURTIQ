"use client";

import { cn } from "@/lib/utils";
import { MOTIVATION, type MotivationStatus } from "@/lib/domain/motivation";
import { MOTIVATION_STYLE } from "./motivation-badge";

const ORDER: MotivationStatus[] = ["green", "yellow", "red", "unrated"];

/** Ampel-Auswahl als Radiogruppe (Tastatur: Pfeiltasten über native Radios). */
export function MotivationPicker({
  value,
  onChange,
  name = "motivation_status",
  disabled,
}: {
  value: MotivationStatus;
  onChange: (status: MotivationStatus) => void;
  name?: string;
  disabled?: boolean;
}) {
  return (
    <div role="radiogroup" aria-label="Trainingsmotivation" className="grid grid-cols-2 gap-2 sm:grid-cols-4">
      {ORDER.map((status) => {
        const meta = MOTIVATION[status];
        const style = MOTIVATION_STYLE[status];
        const checked = value === status;
        return (
          <label
            key={status}
            className={cn(
              "relative flex cursor-pointer flex-col gap-1 rounded-xl border p-3 transition-all has-focus-visible:ring-3 has-focus-visible:ring-ring/50",
              checked ? "border-transparent ring-2 ring-inset" : "border-border hover:bg-accent/50",
              checked && status === "green" && "bg-status-green/10 ring-status-green",
              checked && status === "yellow" && "bg-status-yellow/10 ring-status-yellow",
              checked && status === "red" && "bg-status-red/10 ring-status-red",
              checked && status === "unrated" && "bg-muted ring-muted-foreground/60",
              disabled && "pointer-events-none opacity-60",
            )}
          >
            <input
              type="radio"
              name={name}
              value={status}
              checked={checked}
              onChange={() => onChange(status)}
              disabled={disabled}
              className="sr-only"
            />
            <span className="flex items-center gap-2 font-semibold">
              <span className={cn("flex size-6 items-center justify-center rounded-full text-[oklch(0.18_0.02_258)]", style.dot)}>
                <style.Icon className="size-4" aria-hidden />
              </span>
              {meta.label}
            </span>
            <span className="text-xs text-muted-foreground">{meta.description}</span>
          </label>
        );
      })}
    </div>
  );
}
