"use client";

import { useEffect } from "react";

/**
 * Schutz vor dem Verlust ungespeicherter Änderungen:
 * – Browser-Reload/Tab schließen: natives beforeunload
 * – App-Navigation: Navigationslinks fragen über confirmLeave() nach
 */
let dirtyCount = 0;

const MESSAGE = "Es gibt ungespeicherte Änderungen. Seite wirklich verlassen?";

export function useUnsavedChangesGuard(isDirty: boolean) {
  useEffect(() => {
    if (!isDirty) return;
    dirtyCount += 1;
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => {
      dirtyCount -= 1;
      window.removeEventListener("beforeunload", onBeforeUnload);
    };
  }, [isDirty]);
}

/** true = Navigation erlaubt */
export function confirmLeave(): boolean {
  if (dirtyCount <= 0) return true;
  return window.confirm(MESSAGE);
}
