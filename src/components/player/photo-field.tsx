/* eslint-disable @next/next/no-img-element -- lokale Vorschau (Object-URL) bzw. signierte URL */
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Camera, ImagePlus, Trash2, Undo2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { validatePhotoFile } from "@/lib/validation/player";
import type { PhotoChange } from "@/components/providers/team-data-provider";
import { initials } from "@/lib/domain/format";

interface PhotoFieldProps {
  currentUrl: string | null;
  value: PhotoChange;
  onChange: (change: PhotoChange) => void;
  firstName: string;
  lastName: string;
  disabled?: boolean;
}

/** Foto wählen, Vorschau, ersetzen, entfernen – der Upload erfolgt beim Speichern. */
export function PhotoField({ currentUrl, value, onChange, firstName, lastName, disabled }: PhotoFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const previewUrl = useMemo(() => (value.kind === "replace" ? URL.createObjectURL(value.file) : null), [value]);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const shownUrl = value.kind === "replace" ? previewUrl : value.kind === "remove" ? null : currentUrl;

  return (
    <div className="flex items-center gap-5">
      <div className="relative size-28 shrink-0 overflow-hidden rounded-2xl bg-gradient-to-br from-secondary to-muted ring-1 ring-border">
        {shownUrl ? (
          <img src={shownUrl} alt="Vorschau des Spielerfotos" className="size-full object-cover" />
        ) : (
          <span className="flex size-full items-center justify-center text-3xl font-bold text-muted-foreground" aria-hidden>
            {firstName || lastName ? initials(firstName, lastName) : <Camera className="size-8" />}
          </span>
        )}
      </div>
      <div className="flex flex-col gap-2">
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="sr-only"
          tabIndex={-1}
          aria-hidden
          onChange={(e) => {
            const file = e.target.files?.[0];
            e.target.value = "";
            if (!file) return;
            const problem = validatePhotoFile(file);
            setError(problem);
            if (!problem) onChange({ kind: "replace", file });
          }}
        />
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" disabled={disabled} onClick={() => inputRef.current?.click()}>
            <ImagePlus /> {currentUrl || value.kind === "replace" ? "Foto ersetzen" : "Foto wählen"}
          </Button>
          {value.kind === "replace" && (
            <Button type="button" variant="ghost" disabled={disabled} onClick={() => onChange({ kind: "keep" })}>
              <Undo2 /> Zurücksetzen
            </Button>
          )}
          {currentUrl && value.kind !== "remove" && value.kind !== "replace" && (
            <Button type="button" variant="ghost" disabled={disabled} onClick={() => onChange({ kind: "remove" })}>
              <Trash2 /> Entfernen
            </Button>
          )}
          {value.kind === "remove" && (
            <Button type="button" variant="ghost" disabled={disabled} onClick={() => onChange({ kind: "keep" })}>
              <Undo2 /> Doch behalten
            </Button>
          )}
        </div>
        <p className="text-xs text-muted-foreground">
          JPG, PNG oder WebP, max. 15 MB. Das Bild wird automatisch verkleinert und privat gespeichert.
        </p>
        {error && (
          <p role="alert" className="text-xs font-medium text-destructive">
            {error}
          </p>
        )}
      </div>
    </div>
  );
}
