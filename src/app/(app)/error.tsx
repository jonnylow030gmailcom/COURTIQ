"use client";

import { RotateCw, TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/layout/empty-state";

export default function AppError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <EmptyState
      icon={TriangleAlert}
      title="Hier ist etwas schiefgelaufen"
      description="Die Ansicht konnte nicht geladen werden. Deine gespeicherten Daten sind davon nicht betroffen."
      action={
        <Button onClick={reset}>
          <RotateCw /> Erneut versuchen
        </Button>
      }
    />
  );
}
