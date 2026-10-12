"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, MailCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FormField } from "@/components/ui/form-field";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

const signInSchema = z.object({
  email: z.email("Bitte eine gültige E-Mail-Adresse eingeben."),
  password: z.string().min(1, "Bitte das Passwort eingeben."),
});

const signUpSchema = z.object({
  displayName: z.string().trim().min(2, "Bitte einen Namen mit mindestens 2 Zeichen eingeben.").max(80),
  email: z.email("Bitte eine gültige E-Mail-Adresse eingeben."),
  password: z.string().min(8, "Das Passwort muss mindestens 8 Zeichen lang sein."),
});

type Mode = "signin" | "signup";

function authMessage(message: string): string {
  const m = message.toLowerCase();
  if (m.includes("invalid login credentials")) return "E-Mail oder Passwort ist falsch.";
  if (m.includes("email not confirmed")) return "Bitte zuerst die E-Mail-Adresse über den Link in der Bestätigungsmail bestätigen.";
  if (m.includes("already registered") || m.includes("already been registered")) return "Für diese E-Mail-Adresse gibt es bereits ein Konto.";
  if (m.includes("password")) return "Das Passwort erfüllt die Anforderungen nicht (mindestens 8 Zeichen).";
  if (m.includes("rate limit")) return "Zu viele Versuche. Bitte kurz warten und erneut versuchen.";
  if (m.includes("fetch")) return "Keine Verbindung zum Server. Bitte Internetverbindung prüfen.";
  return "Die Anmeldung ist fehlgeschlagen. Bitte erneut versuchen.";
}

export function LoginForm() {
  const [mode, setMode] = useState<Mode>("signin");
  const [confirmSent, setConfirmSent] = useState(false);
  const searchParams = useSearchParams();
  const confirmError = searchParams.get("error") === "confirm";

  if (confirmSent) {
    return (
      <div className="rounded-2xl border border-border bg-card p-6 text-center">
        <MailCheck className="mx-auto mb-3 size-10 text-primary" aria-hidden />
        <p className="font-semibold">Fast geschafft!</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Wir haben dir eine E-Mail mit einem Bestätigungslink geschickt. Nach der Bestätigung kannst du dich anmelden.
        </p>
        <Button variant="outline" className="mt-5" onClick={() => { setConfirmSent(false); setMode("signin"); }}>
          Zur Anmeldung
        </Button>
      </div>
    );
  }

  return (
    <div>
      <div role="tablist" aria-label="Anmeldung oder Registrierung" className="mb-6 grid grid-cols-2 rounded-xl bg-muted p-1">
        {(["signin", "signup"] as const).map((m) => (
          <button
            key={m}
            role="tab"
            type="button"
            aria-selected={mode === m}
            onClick={() => setMode(m)}
            className={cn(
              "h-10 rounded-lg text-sm font-semibold transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring",
              mode === m ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
            )}
          >
            {m === "signin" ? "Anmelden" : "Registrieren"}
          </button>
        ))}
      </div>
      {confirmError && (
        <p role="alert" className="mb-4 rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
          Der Bestätigungslink ist ungültig oder abgelaufen. Bitte erneut anmelden oder registrieren.
        </p>
      )}
      {mode === "signin" ? <SignInForm /> : <SignUpForm onConfirmationSent={() => setConfirmSent(true)} />}
    </div>
  );
}

function SignInForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  const form = useForm<z.infer<typeof signInSchema>>({
    resolver: zodResolver(signInSchema),
    defaultValues: { email: "", password: "" },
  });
  const { errors, isSubmitting } = form.formState;

  const onSubmit = form.handleSubmit(async (values) => {
    setError(null);
    const { error: authError } = await getSupabaseBrowserClient().auth.signInWithPassword(values);
    if (authError) {
      setError(authMessage(authError.message));
      return;
    }
    const next = searchParams.get("next");
    router.replace(next && next.startsWith("/") && !next.startsWith("//") ? next : "/dashboard");
    router.refresh();
  });

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
      <FormField id="email" label="E-Mail" error={errors.email?.message}>
        <Input id="email" type="email" autoComplete="email" className="h-10" aria-invalid={!!errors.email} {...form.register("email")} />
      </FormField>
      <FormField id="password" label="Passwort" error={errors.password?.message}>
        <Input id="password" type="password" autoComplete="current-password" className="h-10" aria-invalid={!!errors.password} {...form.register("password")} />
      </FormField>
      {error && (
        <p role="alert" className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      )}
      <Button type="submit" size="lg" className="mt-2 h-11" disabled={isSubmitting}>
        {isSubmitting && <Loader2 className="animate-spin" />}
        Anmelden
      </Button>
    </form>
  );
}

function SignUpForm({ onConfirmationSent }: { onConfirmationSent: () => void }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const form = useForm<z.infer<typeof signUpSchema>>({
    resolver: zodResolver(signUpSchema),
    defaultValues: { displayName: "", email: "", password: "" },
  });
  const { errors, isSubmitting } = form.formState;

  const onSubmit = form.handleSubmit(async (values) => {
    setError(null);
    const { data, error: authError } = await getSupabaseBrowserClient().auth.signUp({
      email: values.email,
      password: values.password,
      options: {
        data: { display_name: values.displayName },
        emailRedirectTo: `${window.location.origin}/auth/confirm?next=/onboarding`,
      },
    });
    if (authError) {
      setError(authMessage(authError.message));
      return;
    }
    if (data.session) {
      router.replace("/onboarding");
      router.refresh();
    } else {
      onConfirmationSent();
    }
  });

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
      <FormField id="displayName" label="Dein Name" error={errors.displayName?.message}>
        <Input id="displayName" autoComplete="name" className="h-10" aria-invalid={!!errors.displayName} {...form.register("displayName")} />
      </FormField>
      <FormField id="su-email" label="E-Mail" error={errors.email?.message}>
        <Input id="su-email" type="email" autoComplete="email" className="h-10" aria-invalid={!!errors.email} {...form.register("email")} />
      </FormField>
      <FormField id="su-password" label="Passwort" hint="Mindestens 8 Zeichen." error={errors.password?.message}>
        <Input id="su-password" type="password" autoComplete="new-password" className="h-10" aria-invalid={!!errors.password} {...form.register("password")} />
      </FormField>
      {error && (
        <p role="alert" className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      )}
      <Button type="submit" size="lg" className="mt-2 h-11" disabled={isSubmitting}>
        {isSubmitting && <Loader2 className="animate-spin" />}
        Konto anlegen
      </Button>
    </form>
  );
}
