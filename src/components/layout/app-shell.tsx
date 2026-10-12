"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { Gauge, LayoutGrid, LogOut, Settings, Users, UserSquare2, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { GuardedLink } from "./guarded-link";
import { BrandWordmark, BrandMark } from "./brand";
import { useTeamData } from "@/components/providers/team-data-provider";
import { ROLE_LABEL } from "@/lib/data/team";

const NAV = [
  { href: "/dashboard", label: "Dashboard", icon: Gauge },
  { href: "/spielfeld", label: "Spielfeld", icon: LayoutGrid },
  { href: "/team", label: "Team", icon: Users },
  { href: "/spieler", label: "Spieler", icon: UserSquare2 },
  { href: "/einstellungen", label: "Einstellungen", icon: Settings },
] as const;

function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function AppShell({ displayName, children }: { displayName: string; children: ReactNode }) {
  const pathname = usePathname();
  const { team, isSyncing } = useTeamData();

  return (
    <div className="flex min-h-dvh">
      <a
        href="#main"
        className="sr-only z-50 rounded-md bg-primary px-3 py-2 text-primary-foreground focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
      >
        Zum Inhalt springen
      </a>

      {/* Seitenleiste ab Tablet quer / Desktop */}
      <aside className="sticky top-0 hidden h-dvh w-64 shrink-0 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground lg:flex">
        <div className="px-5 pt-6 pb-5">
          <BrandWordmark />
        </div>
        <div className="mx-4 mb-4 rounded-xl bg-sidebar-accent/70 px-3.5 py-3 ring-1 ring-sidebar-border">
          <p className="text-[0.65rem] font-semibold tracking-[0.16em] text-sidebar-muted uppercase">Mannschaft</p>
          <p className="truncate font-semibold">{team.name}</p>
        </div>
        <nav aria-label="Hauptnavigation" className="flex flex-1 flex-col gap-1 px-3">
          {NAV.map(({ href, label, icon: Icon }) => {
            const active = isActive(pathname, href);
            return (
              <GuardedLink
                key={href}
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "group relative flex h-11 items-center gap-3 rounded-lg px-3 text-sm font-medium transition-colors outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring",
                  active
                    ? "bg-sidebar-accent text-sidebar-accent-foreground"
                    : "text-sidebar-muted hover:bg-sidebar-accent/60 hover:text-sidebar-foreground",
                )}
              >
                <span
                  className={cn(
                    "absolute top-2 bottom-2 left-0 w-[3px] rounded-full bg-sidebar-primary transition-opacity",
                    active ? "opacity-100" : "opacity-0",
                  )}
                  aria-hidden
                />
                <Icon className={cn("size-[1.15rem]", active && "text-sidebar-primary")} aria-hidden />
                {label}
              </GuardedLink>
            );
          })}
        </nav>
        <div className="border-t border-sidebar-border p-4">
          <div className="flex items-center gap-3">
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold">{displayName}</p>
              <p className="truncate text-xs text-sidebar-muted">{ROLE_LABEL[team.role]}</p>
            </div>
            <form action="/auth/signout" method="post">
              <button
                type="submit"
                className="flex size-10 items-center justify-center rounded-lg text-sidebar-muted transition-colors hover:bg-sidebar-accent hover:text-sidebar-foreground focus-visible:ring-2 focus-visible:ring-sidebar-ring focus-visible:outline-none"
                aria-label="Abmelden"
                title="Abmelden"
              >
                <LogOut className="size-4" />
              </button>
            </form>
          </div>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Kopfzeile für Smartphone/Tablet hochkant */}
        <header className="sticky top-0 z-30 flex h-14 items-center justify-between gap-3 border-b border-sidebar-border bg-sidebar px-4 text-sidebar-foreground lg:hidden">
          <span className="flex min-w-0 items-center gap-2.5">
            <BrandMark className="size-7" />
            <span className="truncate text-sm font-semibold">{team.name}</span>
          </span>
          <form action="/auth/signout" method="post">
            <button
              type="submit"
              className="flex size-10 items-center justify-center rounded-lg text-sidebar-muted hover:text-sidebar-foreground focus-visible:ring-2 focus-visible:ring-sidebar-ring focus-visible:outline-none"
              aria-label="Abmelden"
            >
              <LogOut className="size-4" />
            </button>
          </form>
        </header>

        <main id="main" className="mx-auto w-full max-w-[1400px] flex-1 px-4 pt-6 pb-28 sm:px-6 lg:px-10 lg:pt-10 lg:pb-12">
          {children}
        </main>

        {isSyncing && (
          <div
            role="status"
            className="fixed right-4 bottom-24 z-40 flex items-center gap-2 rounded-full bg-popover px-3 py-1.5 text-xs font-medium text-popover-foreground shadow-lg ring-1 ring-border lg:bottom-6"
          >
            <Loader2 className="size-3.5 animate-spin text-primary" aria-hidden />
            Wird gespeichert…
          </div>
        )}

        {/* Untere Navigation für Touch-Geräte */}
        <nav
          aria-label="Hauptnavigation"
          className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 border-t border-sidebar-border bg-sidebar/95 pb-[env(safe-area-inset-bottom)] text-sidebar-foreground backdrop-blur lg:hidden"
        >
          {NAV.map(({ href, label, icon: Icon }) => {
            const active = isActive(pathname, href);
            return (
              <GuardedLink
                key={href}
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex h-16 flex-col items-center justify-center gap-1 text-[0.68rem] font-medium outline-none focus-visible:bg-sidebar-accent",
                  active ? "text-sidebar-primary" : "text-sidebar-muted",
                )}
              >
                <Icon className="size-5" aria-hidden />
                <span className="max-w-full truncate px-1">{label === "Einstellungen" ? "Mehr" : label}</span>
              </GuardedLink>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
