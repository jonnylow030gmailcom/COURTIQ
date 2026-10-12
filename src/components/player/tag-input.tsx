"use client";

import { useId, useState, type KeyboardEvent } from "react";
import { Plus, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface TagInputProps {
  value: string[];
  onChange: (next: string[]) => void;
  suggestions?: readonly string[];
  placeholder?: string;
  id?: string;
  max?: number;
  "aria-describedby"?: string;
}

/** Stichworte: freie Eingabe (Enter/Komma) plus Vorschläge per Klick. */
export function TagInput({ value, onChange, suggestions = [], placeholder, id, max = 30, ...rest }: TagInputProps) {
  const [draft, setDraft] = useState("");
  const fallbackId = useId();
  const inputId = id ?? fallbackId;

  const add = (raw: string) => {
    const tag = raw.trim().replace(/\s+/g, " ").slice(0, 40);
    if (!tag || value.some((t) => t.toLowerCase() === tag.toLowerCase()) || value.length >= max) return;
    onChange([...value, tag]);
  };

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      add(draft);
      setDraft("");
    } else if (e.key === "Backspace" && draft === "" && value.length > 0) {
      onChange(value.slice(0, -1));
    }
  };

  const openSuggestions = suggestions.filter((s) => !value.some((t) => t.toLowerCase() === s.toLowerCase()));

  return (
    <div className="flex flex-col gap-2">
      <div
        className={cn(
          "flex min-h-11 flex-wrap items-center gap-1.5 rounded-lg border border-input bg-transparent px-2 py-1.5 transition-colors focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/50 dark:bg-input/30",
        )}
      >
        {value.map((tag) => (
          <span key={tag} className="inline-flex items-center gap-1 rounded-md bg-primary/15 py-1 pr-1 pl-2 text-sm font-medium text-primary ring-1 ring-primary/25 ring-inset">
            {tag}
            <button
              type="button"
              onClick={() => onChange(value.filter((t) => t !== tag))}
              className="rounded p-0.5 hover:bg-primary/20 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
              aria-label={`${tag} entfernen`}
            >
              <X className="size-3.5" />
            </button>
          </span>
        ))}
        <input
          id={inputId}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={onKeyDown}
          onBlur={() => {
            if (draft.trim()) {
              add(draft);
              setDraft("");
            }
          }}
          placeholder={value.length === 0 ? placeholder : "Weiteres Stichwort…"}
          className="h-8 min-w-[10rem] flex-1 bg-transparent px-1 text-sm outline-none placeholder:text-muted-foreground"
          aria-describedby={rest["aria-describedby"]}
        />
      </div>
      {openSuggestions.length > 0 && (
        <div className="flex flex-wrap gap-1.5" aria-label="Vorschläge">
          {openSuggestions.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => add(s)}
              className="inline-flex h-8 items-center gap-1 rounded-full border border-dashed border-border px-2.5 text-xs font-medium text-muted-foreground transition-colors hover:border-primary/50 hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
            >
              <Plus className="size-3" aria-hidden />
              {s}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
