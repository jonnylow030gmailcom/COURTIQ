import { cn } from "@/lib/utils";

export function BrandMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={cn("size-8", className)} aria-hidden>
      <rect x="1" y="1" width="30" height="30" rx="9" className="fill-sidebar-primary" />
      <path
        d="M7 9.5h18M9.5 9.5a6.5 6.5 0 0 0 13 0"
        className="stroke-sidebar-primary-foreground"
        strokeWidth="2.2"
        fill="none"
        strokeLinecap="round"
      />
      <circle cx="16" cy="21.5" r="3" className="fill-sidebar-primary-foreground" />
    </svg>
  );
}

export function BrandWordmark({ className }: { className?: string }) {
  return (
    <span className={cn("flex items-center gap-2.5", className)}>
      <BrandMark />
      <span className="text-[1.05rem] leading-none font-extrabold tracking-[0.14em]">
        COURT<span className="text-sidebar-primary"> IQ</span>
      </span>
    </span>
  );
}
