"use client";

import { useCallback, useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { Loader2, LogOut, Monitor, Moon, ShieldCheck, Sun, Trash2, UserPlus, Users } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FormField, NativeSelect } from "@/components/ui/form-field";
import { SectionCard } from "@/components/layout/section-card";
import { useTeamData } from "@/components/providers/team-data-provider";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import {
  addTeamMember,
  fetchTeamMembers,
  removeTeamMember,
  renameTeam,
  ROLE_LABEL,
  setMemberRole,
  updateDisplayName,
  type TeamMemberView,
} from "@/lib/data/team";
import { toUserMessage } from "@/lib/data/errors";
import { cn } from "@/lib/utils";
import type { TeamRole } from "@/types/database";

export function SettingsView({ userId, email, displayName }: { userId: string; email: string; displayName: string }) {
  const { team, setTeamName } = useTeamData();
  const isOwner = team.role === "owner";

  return (
    <div className="grid gap-6 xl:grid-cols-2">
      <TeamSection teamId={team.id} name={team.name} isOwner={isOwner} onRenamed={setTeamName} />
      <AccountSection userId={userId} email={email} displayName={displayName} role={team.role} />
      <MembersSection teamId={team.id} isOwner={isOwner} currentUserId={userId} />
      <div className="flex flex-col gap-6">
        <AppearanceSection />
        <PrivacySection />
      </div>
    </div>
  );
}

function TeamSection({ teamId, name, isOwner, onRenamed }: { teamId: string; name: string; isOwner: boolean; onRenamed: (n: string) => void }) {
  const [value, setValue] = useState(name);
  const [busy, setBusy] = useState(false);
  const trimmed = value.trim();
  const save = async () => {
    setBusy(true);
    try {
      await renameTeam(getSupabaseBrowserClient(), teamId, trimmed);
      onRenamed(trimmed);
      toast.success("Mannschaftsname gespeichert.");
    } catch (error) {
      toast.error(toUserMessage(error));
    } finally {
      setBusy(false);
    }
  };
  return (
    <SectionCard title="Mannschaft" icon={<Users className="size-4" />}>
      <form
        className="flex flex-col gap-4 sm:flex-row sm:items-end"
        onSubmit={(e) => {
          e.preventDefault();
          void save();
        }}
      >
        <FormField id="team-name" label="Name der Mannschaft" className="flex-1" hint={isOwner ? undefined : "Nur der/die Eigentümer:in kann den Namen ändern."}>
          <Input id="team-name" value={value} maxLength={80} onChange={(e) => setValue(e.target.value)} disabled={!isOwner} className="h-10" />
        </FormField>
        {isOwner && (
          <Button type="submit" disabled={busy || trimmed.length === 0 || trimmed === name}>
            {busy && <Loader2 className="animate-spin" />} Speichern
          </Button>
        )}
      </form>
    </SectionCard>
  );
}

function AccountSection({ userId, email, displayName, role }: { userId: string; email: string; displayName: string; role: TeamRole }) {
  const router = useRouter();
  const [value, setValue] = useState(displayName);
  const [busy, setBusy] = useState(false);
  const save = async () => {
    setBusy(true);
    try {
      await updateDisplayName(getSupabaseBrowserClient(), userId, value);
      toast.success("Name gespeichert.");
      router.refresh();
    } catch (error) {
      toast.error(toUserMessage(error));
    } finally {
      setBusy(false);
    }
  };
  return (
    <SectionCard title="Mein Konto" icon={<ShieldCheck className="size-4" />}>
      <div className="flex flex-col gap-4">
        <form
          className="flex flex-col gap-4 sm:flex-row sm:items-end"
          onSubmit={(e) => {
            e.preventDefault();
            void save();
          }}
        >
          <FormField id="display-name" label="Anzeigename" className="flex-1">
            <Input id="display-name" value={value} maxLength={80} onChange={(e) => setValue(e.target.value)} className="h-10" />
          </FormField>
          <Button type="submit" disabled={busy || value.trim().length < 2 || value.trim() === displayName}>
            {busy && <Loader2 className="animate-spin" />} Speichern
          </Button>
        </form>
        <dl className="grid gap-2 text-sm">
          <div className="flex justify-between gap-4">
            <dt className="text-muted-foreground">E-Mail</dt>
            <dd className="truncate font-medium">{email}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-muted-foreground">Rolle</dt>
            <dd className="font-medium">{ROLE_LABEL[role]}</dd>
          </div>
        </dl>
        <form action="/auth/signout" method="post">
          <Button type="submit" variant="outline">
            <LogOut /> Abmelden
          </Button>
        </form>
      </div>
    </SectionCard>
  );
}

function MembersSection({ teamId, isOwner, currentUserId }: { teamId: string; isOwner: boolean; currentUserId: string }) {
  const supabase = useMemo(() => getSupabaseBrowserClient(), []);
  const [members, setMembers] = useState<TeamMemberView[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<Exclude<TeamRole, "owner">>("coach");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      setMembers(await fetchTeamMembers(supabase, teamId));
      setError(null);
    } catch (e) {
      setError(toUserMessage(e, "Mitglieder konnten nicht geladen werden."));
    }
  }, [supabase, teamId]);

  useEffect(() => {
    let active = true;
    fetchTeamMembers(supabase, teamId)
      .then((list) => active && setMembers(list))
      .catch((e) => active && setError(toUserMessage(e, "Mitglieder konnten nicht geladen werden.")));
    return () => {
      active = false;
    };
  }, [supabase, teamId]);

  const add = async () => {
    setBusy(true);
    try {
      const result = await addTeamMember(supabase, teamId, email, role);
      if (result === "not_found") toast.error("Zu dieser E-Mail gibt es noch kein Konto. Die Person muss sich zuerst registrieren.");
      else if (result === "exists") toast.info("Diese Person ist bereits Mitglied.");
      else {
        toast.success("Mitglied hinzugefügt.");
        setEmail("");
        await load();
      }
    } catch (e) {
      toast.error(toUserMessage(e));
    } finally {
      setBusy(false);
    }
  };

  const changeRole = async (memberId: string, next: Exclude<TeamRole, "owner">) => {
    try {
      await setMemberRole(supabase, memberId, next);
      toast.success("Rolle geändert.");
      await load();
    } catch (e) {
      toast.error(toUserMessage(e));
    }
  };

  const remove = async (member: TeamMemberView) => {
    if (!window.confirm(`${member.displayName} aus der Mannschaft entfernen?`)) return;
    try {
      await removeTeamMember(supabase, member.id);
      toast.success("Mitglied entfernt.");
      await load();
    } catch (e) {
      toast.error(toUserMessage(e));
    }
  };

  return (
    <SectionCard title="Trainerteam" icon={<Users className="size-4" />}>
      <div className="flex flex-col gap-5">
        {error && <p className="text-sm text-destructive">{error}</p>}
        {!members && !error && <p className="text-sm text-muted-foreground">Wird geladen…</p>}
        {members && (
          <ul className="divide-y divide-border rounded-xl ring-1 ring-border">
            {members.map((m) => (
              <li key={m.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium">
                    {m.displayName}
                    {m.userId === currentUserId && <span className="ml-1.5 text-xs text-muted-foreground">(du)</span>}
                  </span>
                  {(!isOwner || m.role === "owner") && <span className="text-xs text-muted-foreground">{ROLE_LABEL[m.role]}</span>}
                </span>
                {isOwner && m.role !== "owner" && (
                  <>
                    <NativeSelect
                      aria-label={`Rolle von ${m.displayName}`}
                      value={m.role}
                      onChange={(e) => void changeRole(m.id, e.target.value as Exclude<TeamRole, "owner">)}
                      className="h-9 w-40"
                    >
                      <option value="coach">{ROLE_LABEL.coach}</option>
                      <option value="viewer">{ROLE_LABEL.viewer}</option>
                    </NativeSelect>
                    <Button variant="ghost" size="icon" aria-label={`${m.displayName} entfernen`} onClick={() => void remove(m)}>
                      <Trash2 />
                    </Button>
                  </>
                )}
              </li>
            ))}
          </ul>
        )}
        {isOwner && (
          <form
            className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto_auto] sm:items-end"
            onSubmit={(e) => {
              e.preventDefault();
              void add();
            }}
          >
            <FormField id="member-email" label="Trainer:in hinzufügen" hint="Die Person braucht bereits ein COURT-IQ-Konto.">
              <Input id="member-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@verein.de" className="h-10" />
            </FormField>
            <NativeSelect aria-label="Rolle" value={role} onChange={(e) => setRole(e.target.value as Exclude<TeamRole, "owner">)} className="sm:w-40">
              <option value="coach">{ROLE_LABEL.coach}</option>
              <option value="viewer">{ROLE_LABEL.viewer}</option>
            </NativeSelect>
            <Button type="submit" disabled={busy || !email.includes("@")}>
              {busy ? <Loader2 className="animate-spin" /> : <UserPlus />} Hinzufügen
            </Button>
          </form>
        )}
        <p className="text-xs text-muted-foreground">
          Trainer:innen dürfen Spieler anlegen, bearbeiten, löschen und die Aufstellung ändern. „Nur lesen“ sieht alles, ändert nichts.
        </p>
      </div>
    </SectionCard>
  );
}

function AppearanceSection() {
  const { theme, setTheme } = useTheme();
  // Erst nach dem Hydrieren ist das gespeicherte Farbschema bekannt.
  const mounted = useSyncExternalStore(
    () => () => undefined,
    () => true,
    () => false,
  );
  const options = [
    { value: "light", label: "Hell", icon: Sun },
    { value: "dark", label: "Dunkel", icon: Moon },
    { value: "system", label: "System", icon: Monitor },
  ] as const;
  return (
    <SectionCard title="Darstellung" icon={<Monitor className="size-4" />}>
      <div role="radiogroup" aria-label="Farbschema" className="grid grid-cols-3 gap-2">
        {options.map(({ value, label, icon: Icon }) => {
          const active = mounted && theme === value;
          return (
            <button
              key={value}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => setTheme(value)}
              className={cn(
                "flex h-16 flex-col items-center justify-center gap-1 rounded-xl text-sm font-semibold ring-1 transition-colors outline-none ring-inset focus-visible:ring-2 focus-visible:ring-ring",
                active ? "bg-primary/15 text-primary ring-primary" : "ring-border hover:bg-accent",
              )}
            >
              <Icon className="size-4" aria-hidden />
              {label}
            </button>
          );
        })}
      </div>
    </SectionCard>
  );
}

function PrivacySection() {
  return (
    <SectionCard title="Datenschutz" icon={<ShieldCheck className="size-4" />}>
      <ul className="list-disc space-y-1.5 pl-5 text-sm text-muted-foreground">
        <li>Alle Spielerdaten sind nur für Mitglieder dieser Mannschaft sichtbar (Row Level Security).</li>
        <li>Fotos liegen in einem privaten Speicher und werden nur über kurzlebige, signierte Links angezeigt.</li>
        <li>Motivationsbewertungen sind interne Trainerbeobachtungen und werden nie automatisch vergeben.</li>
        <li>Bei Minderjährigen vor dem Einsatz die Einwilligung der Erziehungsberechtigten einholen (siehe README).</li>
      </ul>
    </SectionCard>
  );
}
