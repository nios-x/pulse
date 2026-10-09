import { cn } from "@/lib/utils";

/** The Pulse mark: a heartbeat on a grape-violet tile with a fresh leaf. */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 40" className={cn("size-9 shrink-0", className)} aria-hidden="true">
      <rect width="40" height="40" rx="12" className="fill-brand" />
      <path d="M7.5 22h6l2.6-5.6 4.4 11.2 3.1-7.6 1.9 2h7" fill="none" className="stroke-brand-foreground" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M29 5.5c4.5 0 6.5 2.5 6.5 6.5-4.5 0-6.5-2.5-6.5-6.5Z" className="fill-fruit-leaf" />
    </svg>
  );
}

export function Logo({ className, subtitle = true }: { className?: string; subtitle?: boolean }) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <LogoMark />
      <span className="flex flex-col leading-none">
        <span className="font-heading text-lg font-extrabold tracking-tight">Pulse</span>
        {subtitle && <span className="mt-1 text-xs font-medium text-muted-foreground">Family health</span>}
      </span>
    </span>
  );
}
