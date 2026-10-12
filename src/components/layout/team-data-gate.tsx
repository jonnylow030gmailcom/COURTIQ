"use client";

import type { ReactNode } from "react";
import { CloudOff, RotateCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useTeamData } from "@/components/providers/team-data-provider";
import { EmptyState } from "./empty-state";

/** Zeigt Inhalte erst, wenn die Mannschaftsdaten geladen sind – mit Lade- und Fehlerzustand. */
export function TeamDataGate({ children }: { children: ReactNode }) {
  const { status, loadError, reload } = useTeamData();

  if (status === "loading") {
    return (
      <div aria-busy="true" aria-label="Daten werden geladen" className="space-y-6">
        <Skeleton className="h-9 w-56" />
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-2xl" />
          ))}
        </div>
        <Skeleton className="h-80 rounded-2xl" />
      </div>
    );
  }

  if (status === "error") {
    return (
      <EmptyState
        icon={CloudOff}
        title="Daten konnten nicht geladen werden"
        description={loadError ?? "Der Server ist gerade nicht erreichbar."}
        action={
          <Button onClick={() => void reload()}>
            <RotateCw /> Erneut versuchen
          </Button>
        }
      />
    );
  }

  return <>{children}</>;
}
