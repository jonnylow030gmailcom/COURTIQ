"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FormField } from "@/components/ui/form-field";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { toUserMessage } from "@/lib/data/errors";

const schema = z.object({
  name: z.string().trim().min(1, "Bitte einen Mannschaftsnamen eingeben.").max(80, "Maximal 80 Zeichen."),
});

export function CreateTeamForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const form = useForm<z.infer<typeof schema>>({ resolver: zodResolver(schema), defaultValues: { name: "" } });
  const { errors, isSubmitting } = form.formState;

  const onSubmit = form.handleSubmit(async ({ name }) => {
    setError(null);
    const { error: rpcError } = await getSupabaseBrowserClient().rpc("create_team", { p_name: name });
    if (rpcError) {
      setError(toUserMessage(rpcError, "Die Mannschaft konnte nicht angelegt werden."));
      return;
    }
    router.replace("/dashboard");
    router.refresh();
  });

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
      <FormField id="team-name" label="Name der Mannschaft" hint="z. B. „1. Herren“ oder „B-Jugend männlich“" error={errors.name?.message}>
        <Input id="team-name" className="h-10" autoFocus aria-invalid={!!errors.name} {...form.register("name")} />
      </FormField>
      {error && (
        <p role="alert" className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      )}
      <Button type="submit" size="lg" className="h-11" disabled={isSubmitting}>
        {isSubmitting && <Loader2 className="animate-spin" />}
        Mannschaft anlegen
      </Button>
    </form>
  );
}
