"use client";

import Link from "next/link";
import type { ComponentProps } from "react";
import { confirmLeave } from "@/lib/hooks/use-unsaved-changes";

/** Link, der bei ungespeicherten Formularänderungen vor dem Verlassen nachfragt. */
export function GuardedLink({ onClick, ...props }: ComponentProps<typeof Link>) {
  return (
    <Link
      {...props}
      onClick={(event) => {
        if (!confirmLeave()) {
          event.preventDefault();
          return;
        }
        onClick?.(event);
      }}
    />
  );
}
