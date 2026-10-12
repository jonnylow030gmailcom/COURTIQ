"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { CalendarDays, Loader2, NotebookPen, Pencil, RotateCw, Save, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useTeamData } from "@/components/providers/team-data-provider";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { createPlayerNote, deletePlayerNote, fetchPlayerNotes, sortNotes, updatePlayerNote, type PlayerNote } from "@/lib/data/notes";
import { toUserMessage } from "@/lib/data/errors";
import { formatDateTime, todayIso } from "@/lib/domain/format";
import { useUnsavedChangesGuard } from "@/lib/hooks/use-unsaved-changes";

const MAX_LENGTH = 10000;

const weekdayFormatter = new Intl.DateTimeFormat("de-DE", { weekday: "long", day: "2-digit", month: "long", year: "numeric" });

/** „Montag, 12. Oktober 2026“ – ohne Zeitzonenverschiebung aus YYYY-MM-DD. */
function formatNoteDate(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  return weekdayFormatter.format(new Date(y, m - 1, d));
}

function isValidDate(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && value >= "1900-01-01";
}

/**
 * Datierte Trainer-Notizen: Jede Notiz bekommt über den Kalender ein Datum und bleibt
 * dauerhaft im Profil sichtbar (neueste oben).
 */
export function TrainerNotes({ playerId }: { playerId: string }) {
  const { team, canEdit, currentUserId } = useTeamData();
  const supabase = useMemo(() => getSupabaseBrowserClient(), []);
  const [notes, setNotes] = useState<PlayerNote[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [noteDate, setNoteDate] = useState(todayIso());
  const [body, setBody] = useState("");
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [toDelete, setToDelete] = useState<PlayerNote | null>(null);

  useUnsavedChangesGuard(body.trim().length > 0 && !saving);

  const load = useCallback(async () => {
    try {
      setNotes(await fetchPlayerNotes(supabase, playerId));
      setLoadError(null);
    } catch (error) {
      setLoadError(toUserMessage(error, "Die Notizen konnten nicht geladen werden."));
    }
  }, [supabase, playerId]);

  useEffect(() => {
    let active = true;
    fetchPlayerNotes(supabase, playerId)
      .then((list) => active && setNotes(list))
      .catch((error) => active && setLoadError(toUserMessage(error, "Die Notizen konnten nicht geladen werden.")));
    return () => {
      active = false;
    };
  }, [supabase, playerId]);

  const canSave = body.trim().length > 0 && isValidDate(noteDate) && !saving;

  const save = async () => {
    if (!canSave) return;
    setSaving(true);
    try {
      const note = await createPlayerNote(supabase, { teamId: team.id, playerId, noteDate, body });
      setNotes((list) => sortNotes([note, ...(list ?? [])]));
      setBody("");
      setNoteDate(todayIso());
      toast.success("Notiz gespeichert.");
    } catch (error) {
      toast.error(toUserMessage(error, "Die Notiz konnte nicht gespeichert werden."));
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!toDelete) return;
    const note = toDelete;
    setToDelete(null);
    try {
      await deletePlayerNote(supabase, note.id);
      setNotes((list) => (list ?? []).filter((n) => n.id !== note.id));
      toast.success("Notiz gelöscht.");
    } catch (error) {
      toast.error(toUserMessage(error, "Die Notiz konnte nicht gelöscht werden."));
    }
  };

  return (
    <section className="rounded-2xl border border-border bg-card p-5 sm:p-6" aria-labelledby="trainer-notes-title">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 id="trainer-notes-title" className="flex items-center gap-2.5 text-base font-bold">
          <span className="flex size-8 items-center justify-center rounded-lg bg-primary/12 text-primary ring-1 ring-primary/25">
            <NotebookPen className="size-4" />
          </span>
          Trainer-Notizen
          {notes && notes.length > 0 && (
            <span className="rounded-full bg-secondary px-2 py-0.5 text-xs font-bold text-secondary-foreground tabular-nums">{notes.length}</span>
          )}
        </h2>
      </div>

      {canEdit && (
        <form
          className="mb-6 grid gap-3 rounded-xl bg-surface p-4 ring-1 ring-border"
          onSubmit={(e) => {
            e.preventDefault();
            void save();
          }}
        >
          <div className="flex flex-wrap items-end gap-3">
            <div className="grid gap-1.5">
              <label htmlFor="note-date" className="flex items-center gap-1.5 text-sm font-medium">
                <CalendarDays className="size-4 text-primary" aria-hidden /> Datum
              </label>
              <Input
                id="note-date"
                type="date"
                required
                min="1900-01-01"
                value={noteDate}
                onChange={(e) => setNoteDate(e.target.value)}
                className="h-10 w-48"
              />
            </div>
            <p className="pb-2 text-xs text-muted-foreground">Standard ist heute – über den Kalender änderbar.</p>
          </div>
          <div className="grid gap-1.5">
            <label htmlFor="note-body" className="text-sm font-medium">
              Neue Notiz
            </label>
            <Textarea
              id="note-body"
              rows={7}
              maxLength={MAX_LENGTH}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Beobachtung aus Training oder Spiel, Gespräch, Entwicklung …"
              className="min-h-40 text-base leading-relaxed"
            />
            <p className="text-right text-xs text-muted-foreground tabular-nums">
              {body.length.toLocaleString("de-DE")} / {MAX_LENGTH.toLocaleString("de-DE")}
            </p>
          </div>
          <div className="flex justify-end gap-2">
            {body.length > 0 && (
              <Button type="button" variant="ghost" onClick={() => setBody("")} disabled={saving}>
                Verwerfen
              </Button>
            )}
            <Button type="submit" disabled={!canSave}>
              {saving ? <Loader2 className="animate-spin" /> : <Save />}
              Notiz speichern
            </Button>
          </div>
        </form>
      )}

      {loadError ? (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm">
          <span className="text-destructive">{loadError}</span>
          <Button size="sm" variant="outline" onClick={() => void load()}>
            <RotateCw /> Erneut laden
          </Button>
        </div>
      ) : notes === null ? (
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" /> Notizen werden geladen…
        </p>
      ) : notes.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border px-4 py-4 text-sm text-muted-foreground">
          Noch keine Trainer-Notizen.{canEdit ? " Die erste Notiz erscheint hier, sobald du sie speicherst." : ""}
        </p>
      ) : (
        <ol className="relative ml-1.5 space-y-4 border-l-2 border-border pl-6">
          {notes.map((note) =>
            editingId === note.id ? (
              <NoteEditor
                key={note.id}
                note={note}
                onCancel={() => setEditingId(null)}
                onSaved={(updated) => {
                  setNotes((list) => sortNotes((list ?? []).map((n) => (n.id === updated.id ? updated : n))));
                  setEditingId(null);
                }}
              />
            ) : (
              <li key={note.id} className="relative">
                <span aria-hidden className="absolute top-1.5 -left-[1.95rem] size-3 rounded-full bg-primary ring-4 ring-card" />
                <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                  <p className="text-sm font-bold">
                    <time dateTime={note.note_date}>{formatNoteDate(note.note_date)}</time>
                  </p>
                  <div className="flex items-center gap-1">
                    <span className="text-xs text-muted-foreground">{note.authorName}</span>
                    {canEdit && note.author_id === currentUserId && (
                      <Button size="icon-sm" variant="ghost" aria-label="Notiz bearbeiten" onClick={() => setEditingId(note.id)}>
                        <Pencil />
                      </Button>
                    )}
                    {((canEdit && note.author_id === currentUserId) || team.role === "owner") && (
                      <Button size="icon-sm" variant="ghost" aria-label="Notiz löschen" onClick={() => setToDelete(note)}>
                        <Trash2 />
                      </Button>
                    )}
                  </div>
                </div>
                <p className="mt-1.5 text-sm leading-relaxed whitespace-pre-line text-foreground/90">{note.body}</p>
                {note.updated_at !== note.created_at && (
                  <p className="mt-1 text-[0.7rem] text-muted-foreground">bearbeitet am {formatDateTime(note.updated_at)}</p>
                )}
              </li>
            ),
          )}
        </ol>
      )}

      <AlertDialog open={toDelete !== null} onOpenChange={(open) => !open && setToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Notiz löschen?</AlertDialogTitle>
            <AlertDialogDescription>
              Die Notiz vom {toDelete ? formatNoteDate(toDelete.note_date) : ""} wird dauerhaft entfernt.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Abbrechen</AlertDialogCancel>
            <Button variant="destructive" onClick={() => void confirmDelete()}>
              <Trash2 /> Löschen
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
}

function NoteEditor({ note, onCancel, onSaved }: { note: PlayerNote; onCancel: () => void; onSaved: (n: PlayerNote) => void }) {
  const supabase = useMemo(() => getSupabaseBrowserClient(), []);
  const [noteDate, setNoteDate] = useState(note.note_date);
  const [body, setBody] = useState(note.body);
  const [saving, setSaving] = useState(false);
  const dirty = noteDate !== note.note_date || body !== note.body;
  useUnsavedChangesGuard(dirty && !saving);

  const save = async () => {
    setSaving(true);
    try {
      onSaved(await updatePlayerNote(supabase, note.id, { noteDate, body }));
      toast.success("Notiz aktualisiert.");
    } catch (error) {
      toast.error(toUserMessage(error, "Die Notiz konnte nicht gespeichert werden."));
    } finally {
      setSaving(false);
    }
  };

  return (
    <li className="relative">
      <span aria-hidden className="absolute top-3 -left-[1.95rem] size-3 rounded-full bg-primary ring-4 ring-card" />
      <form
        className="grid gap-3 rounded-xl bg-surface p-3 ring-1 ring-primary/40"
        onSubmit={(e) => {
          e.preventDefault();
          void save();
        }}
      >
        <Input
          type="date"
          aria-label="Datum der Notiz"
          required
          min="1900-01-01"
          value={noteDate}
          onChange={(e) => setNoteDate(e.target.value)}
          className="h-10 w-48"
        />
        <Textarea aria-label="Notiz" rows={6} maxLength={MAX_LENGTH} value={body} onChange={(e) => setBody(e.target.value)} className="text-base leading-relaxed" />
        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onCancel} disabled={saving}>
            <X /> Abbrechen
          </Button>
          <Button type="submit" disabled={saving || !dirty || body.trim().length === 0 || !isValidDate(noteDate)}>
            {saving ? <Loader2 className="animate-spin" /> : <Save />} Speichern
          </Button>
        </div>
      </form>
    </li>
  );
}
