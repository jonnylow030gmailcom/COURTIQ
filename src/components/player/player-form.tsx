"use client";

import { useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Controller, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Save } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { FormField, NativeSelect } from "@/components/ui/form-field";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useTeamData, type PhotoChange } from "@/components/providers/team-data-provider";
import { useUnsavedChangesGuard } from "@/lib/hooks/use-unsaved-changes";
import { FIELD_POSITIONS, type FieldPositionCode } from "@/lib/domain/positions";
import { todayIso } from "@/lib/domain/format";
import { toUserMessage } from "@/lib/data/errors";
import {
  EMPTY_PLAYER_FORM,
  playerFormSchema,
  TAG_SUGGESTIONS,
  THROWING_HAND_LABEL,
  toPlayerFormValues,
  type PlayerFormValues,
} from "@/lib/validation/player";
import { cn } from "@/lib/utils";
import type { PlayerRow } from "@/types/database";
import { TagInput } from "./tag-input";
import { MotivationPicker } from "./motivation-picker";
import { PhotoField } from "./photo-field";

const SECTIONS = [
  { id: "stammdaten", label: "Stammdaten" },
  { id: "positionen", label: "Positionen" },
  { id: "staerken", label: "StÃ¤rken & SchwÃ¤chen" },
  { id: "angriff", label: "Angriff" },
  { id: "abwehr", label: "Abwehr" },
  { id: "motivation", label: "Motivation" },
  { id: "notizen", label: "Allgemeine Notizen" },
] as const;

function FormSection({ id, title, description, children }: { id: string; title: string; description?: string; children: ReactNode }) {
  return (
    <section id={id} aria-labelledby={`${id}-title`} className="scroll-mt-24 rounded-2xl border border-border bg-card p-5 sm:p-6">
      <h2 id={`${id}-title`} className="text-base font-bold">
        {title}
      </h2>
      {description && <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>}
      <div className="mt-5 grid gap-5">{children}</div>
    </section>
  );
}

export function PlayerForm({ player }: { player?: PlayerRow }) {
  const router = useRouter();
  const { createPlayer, updatePlayer, photoUrl } = useTeamData();
  const [photo, setPhoto] = useState<PhotoChange>({ kind: "keep" });
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const isEdit = Boolean(player);

  const form = useForm<PlayerFormValues>({
    resolver: zodResolver(playerFormSchema),
    defaultValues: player ? toPlayerFormValues(player) : EMPTY_PLAYER_FORM,
    mode: "onTouched",
  });
  const { register, control, handleSubmit, formState, reset } = form;
  const { errors, isSubmitting, isDirty } = formState;
  const hasChanges = isDirty || photo.kind !== "keep";
  useUnsavedChangesGuard(hasChanges && !isSubmitting);

  const [primary, firstName, lastName] = useWatch({ control, name: ["primary_position", "first_name", "last_name"] });

  const onSubmit = handleSubmit(
    async (values) => {
      setSubmitError(null);
      try {
        const saved = player ? await updatePlayer(player.id, values, photo) : await createPlayer(values, photo);
        reset(toPlayerFormValues(saved));
        setPhoto({ kind: "keep" });
        toast.success(isEdit ? "Ã„nderungen gespeichert." : `${saved.first_name} ${saved.last_name} wurde angelegt.`);
        router.push(`/spieler/${saved.id}`);
      } catch (error) {
        setSubmitError(toUserMessage(error, "Der Spieler konnte nicht gespeichert werden."));
      }
    },
    () => {
      setSubmitError("Bitte die markierten Felder prÃ¼fen.");
      requestAnimationFrame(() => document.querySelector<HTMLElement>("[aria-invalid='true']")?.focus());
    },
  );

  const cancel = () => {
    if (hasChanges) setConfirmCancel(true);
    else router.back();
  };

  const leave = () => {
    reset();
    setPhoto({ kind: "keep" });
    setConfirmCancel(false);
    router.push(player ? `/spieler/${player.id}` : "/spieler");
  };

  const err = (name: keyof PlayerFormValues) => errors[name]?.message as string | undefined;
  const aria = (name: keyof PlayerFormValues) => ({
    "aria-invalid": Boolean(errors[name]) || undefined,
    "aria-describedby": errors[name] ? `${name}-error` : undefined,
  });

  return (
    <form onSubmit={onSubmit} noValidate className="grid gap-6 lg:grid-cols-[200px_minmax(0,1fr)]">
      <nav aria-label="Formularbereiche" className="hidden lg:block">
        <ul className="sticky top-10 space-y-1 text-sm">
          {SECTIONS.map((s) => (
            <li key={s.id}>
              <a
                href={`#${s.id}`}
                className="block rounded-lg px-3 py-2 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              >
                {s.label}
              </a>
            </li>
          ))}
        </ul>
      </nav>

      <div className="flex min-w-0 flex-col gap-6">
        <FormSection id="stammdaten" title="Stammdaten" description="Pflichtfelder sind mit * markiert.">
          <PhotoField
            currentUrl={player ? photoUrl(player) : null}
            value={photo}
            onChange={setPhoto}
            firstName={firstName}
            lastName={lastName}
            disabled={isSubmitting}
          />
          <div className="grid gap-5 sm:grid-cols-2">
            <FormField id="first_name" label="Vorname" required error={err("first_name")}>
              <Input id="first_name" autoComplete="off" className="h-10" {...aria("first_name")} {...register("first_name")} />
            </FormField>
            <FormField id="last_name" label="Nachname" required error={err("last_name")}>
              <Input id="last_name" autoComplete="off" className="h-10" {...aria("last_name")} {...register("last_name")} />
            </FormField>
            <FormField id="birth_date" label="Geburtsdatum" hint="Das Alter wird automatisch berechnet." error={err("birth_date")}>
              <Input id="birth_date" type="date" max={todayIso()} min="1900-01-01" className="h-10" {...aria("birth_date")} {...register("birth_date")} />
            </FormField>
            <FormField id="jersey_number" label="Trikotnummer" hint="Optional, 0â€“99" error={err("jersey_number")}>
              <Input id="jersey_number" inputMode="numeric" className="h-10" {...aria("jersey_number")} {...register("jersey_number")} />
            </FormField>
            <FormField id="height_cm" label="GrÃ¶ÃŸe (cm)" hint="Optional" error={err("height_cm")}>
              <Input id="height_cm" inputMode="numeric" className="h-10" {...aria("height_cm")} {...register("height_cm")} />
            </FormField>
            <FormField id="throwing_hand" label="Wurfhand" hint="Optional" error={err("throwing_hand")}>
              <NativeSelect id="throwing_hand" {...register("throwing_hand")}>
                <option value="">Keine Angabe</option>
                {Object.entries(THROWING_HAND_LABEL).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </NativeSelect>
            </FormField>
          </div>
        </FormSection>

        <FormSection id="positionen" title="Positionen">
          <FormField id="primary_position" label="Bevorzugte Position" hint="Kann offen bleiben, bis sie feststeht." error={err("primary_position")}>
            <NativeSelect id="primary_position" {...aria("primary_position")} {...register("primary_position")}>
              <option value="">Noch offen</option>
              {FIELD_POSITIONS.map((p) => (
                <option key={p.code} value={p.code}>
                  {p.code} â€“ {p.label}
                </option>
              ))}
            </NativeSelect>
          </FormField>
          <Controller
            control={control}
            name="alternative_positions"
            render={({ field }) => (
              <fieldset>
                <legend className="mb-2 text-sm font-medium">Alternative Positionen</legend>
                <div className="flex flex-wrap gap-2">
                  {FIELD_POSITIONS.filter((p) => p.code !== primary).map((p) => {
                    const checked = field.value.includes(p.code);
                    return (
                      <label
                        key={p.code}
                        className={cn(
                          "inline-flex h-10 cursor-pointer items-center gap-2 rounded-lg border px-3 text-sm font-medium transition-colors has-focus-visible:ring-3 has-focus-visible:ring-ring/50",
                          checked ? "border-primary bg-primary/15 text-primary" : "border-border hover:bg-accent",
                        )}
                      >
                        <input
                          type="checkbox"
                          className="sr-only"
                          checked={checked}
                          onChange={() =>
                            field.onChange(
                              checked
                                ? field.value.filter((c: FieldPositionCode) => c !== p.code)
                                : [...field.value, p.code],
                            )
                          }
                        />
                        <span className="font-bold">{p.code}</span>
                        <span className="text-muted-foreground">{p.label}</span>
                      </label>
                    );
                  })}
                </div>
                {err("alternative_positions") && (
                  <p role="alert" className="mt-1.5 text-xs font-medium text-destructive">
                    {err("alternative_positions")}
                  </p>
                )}
              </fieldset>
            )}
          />
        </FormSection>

        <FormSection id="staerken" title="StÃ¤rken & SchwÃ¤chen" description="Stichworte fÃ¼r den schnellen Ãœberblick, Freitext fÃ¼r ausfÃ¼hrliche Beobachtungen.">
          <div className="grid gap-5 xl:grid-cols-2">
            <div className="grid gap-3">
              <FormField id="strengths" label="StÃ¤rken (Stichworte)" error={err("strengths")}>
                <Controller
                  control={control}
                  name="strengths"
                  render={({ field }) => (
                    <TagInput id="strengths" value={field.value} onChange={field.onChange} suggestions={TAG_SUGGESTIONS.strengths} placeholder="z. B. Wurfkraft" />
                  )}
                />
              </FormField>
              <FormField id="strengths_notes" label="StÃ¤rken â€“ Notizen" error={err("strengths_notes")}>
                <Textarea id="strengths_notes" rows={5} {...register("strengths_notes")} />
              </FormField>
            </div>
            <div className="grid gap-3">
              <FormField id="weaknesses" label="SchwÃ¤chen (Stichworte)" error={err("weaknesses")}>
                <Controller
                  control={control}
                  name="weaknesses"
                  render={({ field }) => (
                    <TagInput id="weaknesses" value={field.value} onChange={field.onChange} suggestions={TAG_SUGGESTIONS.weaknesses} placeholder="z. B. RÃ¼ckzugsverhalten" />
                  )}
                />
              </FormField>
              <FormField id="weaknesses_notes" label="SchwÃ¤chen â€“ Notizen" error={err("weaknesses_notes")}>
                <Textarea id="weaknesses_notes" rows={5} {...register("weaknesses_notes")} />
              </FormField>
            </div>
          </div>
        </FormSection>

        <FormSection id="angriff" title="Angriffsverhalten">
          <FormField id="attack_traits" label="Eigenschaften" error={err("attack_traits")}>
            <Controller
              control={control}
              name="attack_traits"
              render={({ field }) => (
                <TagInput id="attack_traits" value={field.value} onChange={field.onChange} suggestions={TAG_SUGGESTIONS.attack} placeholder="z. B. Durchbruch" />
              )}
            />
          </FormField>
          <FormField id="attack_behavior" label="Beobachtungen im Angriff" error={err("attack_behavior")}>
            <Textarea id="attack_behavior" rows={6} {...register("attack_behavior")} />
          </FormField>
        </FormSection>

        <FormSection id="abwehr" title="Abwehrverhalten">
          <FormField id="defense_traits" label="Eigenschaften" error={err("defense_traits")}>
            <Controller
              control={control}
              name="defense_traits"
              render={({ field }) => (
                <TagInput id="defense_traits" value={field.value} onChange={field.onChange} suggestions={TAG_SUGGESTIONS.defense} placeholder="z. B. Antizipation" />
              )}
            />
          </FormField>
          <FormField id="defense_behavior" label="Beobachtungen in der Abwehr" error={err("defense_behavior")}>
            <Textarea id="defense_behavior" rows={6} {...register("defense_behavior")} />
          </FormField>
          <FormField id="tactical_notes" label="Taktische Besonderheiten" error={err("tactical_notes")}>
            <Textarea id="tactical_notes" rows={4} {...register("tactical_notes")} />
          </FormField>
        </FormSection>

        <FormSection
          id="motivation"
          title="Trainingsmotivation"
          description="Interne Trainerbeobachtung. Der Zeitpunkt der Bewertung wird beim Speichern automatisch festgehalten."
        >
          <Controller
            control={control}
            name="motivation_status"
            render={({ field }) => <MotivationPicker value={field.value} onChange={field.onChange} disabled={isSubmitting} />}
          />
          <FormField id="motivation_note" label="BegrÃ¼ndung (optional)" error={err("motivation_note")}>
            <Textarea id="motivation_note" rows={3} {...register("motivation_note")} />
          </FormField>
        </FormSection>

        <FormSection
          id="notizen"
          title="Allgemeine Notizen"
          description="Datierte Trainer-Notizen erfasst du direkt im Spielerprofil â€“ dort bleiben alle EintrÃ¤ge mit Datum sichtbar."
        >
          <FormField id="coach_notes" label="Individuelle Hinweise fÃ¼r das Trainerteam" error={err("coach_notes")}>
            <Textarea id="coach_notes" rows={5} {...register("coach_notes")} />
          </FormField>
          <FormField id="general_notes" label="Allgemein" error={err("general_notes")}>
            <Textarea id="general_notes" rows={5} {...register("general_notes")} />
          </FormField>
        </FormSection>

        {/* Aktionsleiste */}
        <div className="sticky bottom-20 z-20 flex flex-col gap-3 rounded-2xl border border-border bg-popover/95 p-3 shadow-xl backdrop-blur sm:flex-row sm:items-center sm:justify-between lg:bottom-4">
          <p className="px-2 text-sm" role="status">
            {submitError ? (
              <span className="font-medium text-destructive">{submitError}</span>
            ) : hasChanges ? (
              <span className="text-muted-foreground">Ungespeicherte Ã„nderungen</span>
            ) : (
              <span className="text-muted-foreground">{isEdit ? "Keine Ã„nderungen" : "Neuer Spieler"}</span>
            )}
          </p>
          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={cancel} disabled={isSubmitting} className="flex-1 sm:flex-none">
              Abbrechen
            </Button>
            <Button type="submit" disabled={isSubmitting || (isEdit && !hasChanges)} className="flex-1 sm:flex-none">
              {isSubmitting ? <Loader2 className="animate-spin" /> : <Save />}
              {isSubmitting ? (photo.kind === "replace" ? "Foto wird hochgeladenâ€¦" : "Wird gespeichertâ€¦") : isEdit ? "Speichern" : "Spieler anlegen"}
            </Button>
          </div>
        </div>
      </div>

      <AlertDialog open={confirmCancel} onOpenChange={setConfirmCancel}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Ã„nderungen verwerfen?</AlertDialogTitle>
            <AlertDialogDescription>Die ungespeicherten Eingaben gehen dabei verloren.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Weiter bearbeiten</AlertDialogCancel>
            <Button variant="destructive" onClick={leave}>
              Verwerfen
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </form>
  );
}
