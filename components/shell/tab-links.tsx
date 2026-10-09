import Link from "next/link";
import { cn } from "@/lib/utils";

/** URL-driven tabs: each tab is a link, so tabs can be shared and the back button works. */
export function TabLinks({ tabs, active, label }: { tabs: { key: string; label: string; href: string; count?: number }[]; active: string; label: string }) {
  return (
    <nav aria-label={label} className="scrollbar-none -mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
      <ul className="flex min-w-max gap-1 border-b border-border">
        {tabs.map((t) => {
          const on = t.key === active;
          return (
            <li key={t.key}>
              <Link
                href={t.href}
                scroll={false}
                aria-current={on ? "page" : undefined}
                className={cn(
                  "relative inline-flex min-h-12 items-center gap-2 px-3.5 text-base font-medium transition-colors duration-150",
                  "after:absolute after:inset-x-2 after:-bottom-px after:h-0.5 after:rounded-full after:bg-primary after:transition-opacity",
                  on ? "text-foreground after:opacity-100" : "text-muted-foreground after:opacity-0 hover:text-foreground"
                )}
              >
                {t.label}
                {t.count != null && <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-semibold text-muted-foreground tabular">{t.count}</span>}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
