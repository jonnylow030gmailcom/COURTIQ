import type { ReactNode } from "react";
import { BrandWordmark, ElitehandballLogo } from "./brand";
import { goalArcPath } from "@/lib/domain/court";

/** Dekoratives Halbfeld: alle Linien bleiben innerhalb der Spielfeldbegrenzung. */
function CourtIllustration() {
  return (
    <svg viewBox="-0.5 -1.6 21 22.2" preserveAspectRatio="xMidYMid meet" className="absolute inset-0 size-full" aria-hidden>
      <defs>
        <clipPath id="auth-court-clip">
          <rect x="0" y="0" width="20" height="20" />
        </clipPath>
      </defs>
      <g fill="none" stroke="currentColor" strokeWidth="0.09">
        <rect x="0" y="0" width="20" height="20" rx="0.15" />
        <g clipPath="url(#auth-court-clip)">
          <path d={`${goalArcPath(6)} Z`} fill="currentColor" fillOpacity="0.06" />
          <path d={goalArcPath(9)} strokeDasharray="0.35 0.3" />
          <line x1="9.5" y1="7" x2="10.5" y2="7" />
          <path d="M 8 20 A 2 2 0 0 1 12 20" />
        </g>
        <rect x="8.5" y="-1" width="3" height="1" strokeOpacity="0.7" />
      </g>
    </svg>
  );
}

/** Gemeinsamer Rahmen für Anmeldung und Onboarding. */
export function AuthFrame({ title, subtitle, children }: { title: string; subtitle: string; children: ReactNode }) {
  return (
    <div className="grid min-h-dvh lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)]">
      <aside className="relative sticky top-0 hidden h-dvh flex-col overflow-hidden bg-sidebar px-12 py-10 text-sidebar-foreground lg:flex xl:px-16">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(70%_55%_at_50%_35%,color-mix(in_oklch,var(--sidebar-primary)_14%,transparent),transparent_70%)]"
        />
        <BrandWordmark className="relative" />

        <div className="relative flex min-h-0 flex-1 items-center justify-center py-8 text-sidebar-primary/35">
          <div className="relative h-full max-h-[440px] w-full">
            <CourtIllustration />
          </div>
        </div>

        <div className="relative max-w-md">
          <p className="text-3xl leading-tight font-bold text-balance">Deine Mannschaft. Auf einen Blick.</p>
          <p className="mt-3 text-base leading-relaxed text-sidebar-muted">
            Aufstellung, Spielerprofile und Trainingsmotivation – an einem Ort, auf Tablet und Desktop.
          </p>
          <div className="mt-8 flex items-center gap-3 border-t border-sidebar-border pt-6 text-xs font-semibold tracking-[0.16em] text-sidebar-muted uppercase">
            <ElitehandballLogo className="h-6" />
            Ein Produkt von Elitehandball
          </div>
        </div>
      </aside>

      <main className="flex items-center justify-center px-4 py-12 sm:px-8">
        <div className="w-full max-w-sm">
          <div className="mb-10 inline-flex rounded-2xl bg-sidebar px-4 py-3 lg:hidden">
            <BrandWordmark />
          </div>
          <h1 className="text-2xl font-bold">{title}</h1>
          <p className="mt-1 mb-6 text-sm text-muted-foreground">{subtitle}</p>
          {children}
        </div>
      </main>
    </div>
  );
}
