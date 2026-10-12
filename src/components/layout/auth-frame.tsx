import type { ReactNode } from "react";
import { BrandWordmark } from "./brand";

/** Gemeinsamer Rahmen für Anmeldung und Onboarding. */
export function AuthFrame({ title, subtitle, children }: { title: string; subtitle: string; children: ReactNode }) {
  return (
    <div className="grid min-h-dvh lg:grid-cols-[1.1fr_1fr]">
      <div className="relative hidden overflow-hidden bg-sidebar text-sidebar-foreground lg:flex lg:flex-col lg:justify-between lg:p-12">
        <BrandWordmark />
        <svg viewBox="-1.2 -1.8 22.4 22.6" className="absolute top-1/2 left-1/2 w-[85%] -translate-x-1/2 -translate-y-1/2 opacity-[0.16]" aria-hidden>
          <g fill="none" stroke="currentColor" strokeWidth="0.09">
            <rect x="0" y="0" width="20" height="20" />
            <path d="M 2.5 0 A 6 6 0 0 0 8.5 6 L 11.5 6 A 6 6 0 0 0 17.5 0" />
            <path d="M -0.5 0 A 9 9 0 0 0 8.5 9 L 11.5 9 A 9 9 0 0 0 20.5 0" strokeDasharray="0.35 0.3" />
          </g>
        </svg>
        <div className="relative max-w-md">
          <p className="text-3xl leading-tight font-bold">Deine Mannschaft. Auf einen Blick.</p>
          <p className="mt-3 text-sidebar-muted">
            Aufstellung, Spielerprofile und Trainingsmotivation – an einem Ort, auf Tablet und Desktop.
          </p>
        </div>
      </div>
      <div className="flex items-center justify-center px-4 py-12 sm:px-8">
        <div className="w-full max-w-sm">
          <div className="mb-8 lg:hidden">
            <BrandWordmark />
          </div>
          <h1 className="text-2xl font-bold">{title}</h1>
          <p className="mt-1 mb-6 text-sm text-muted-foreground">{subtitle}</p>
          {children}
        </div>
      </div>
    </div>
  );
}
