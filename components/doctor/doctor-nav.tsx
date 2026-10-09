"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarDays, UserRoundCog, Users } from "lucide-react";
import { cn } from "@/lib/utils";

const ITEMS = [
  { href: "/doctor", label: "Today", icon: CalendarDays, exact: true },
  { href: "/doctor/patients", label: "Patients", icon: Users },
  { href: "/doctor/profile", label: "Profile & hours", icon: UserRoundCog },
];

export function DoctorNav({ variant }: { variant: "side" | "bottom" }) {
  const pathname = usePathname();
  const active = (h: string, exact?: boolean) => (exact ? pathname === h : pathname.startsWith(h));
  if (variant === "bottom") {
    return (
      <nav aria-label="Doctor" className="no-print fixed inset-x-0 bottom-0 z-40 border-t border-border bg-card/95 pb-safe backdrop-blur lg:hidden">
        <ul className="mx-auto flex max-w-md gap-1 px-2 py-1.5">
          {ITEMS.map((i) => (
            <li key={i.href} className="flex flex-1">
              <Link href={i.href} aria-current={active(i.href, i.exact) ? "page" : undefined} className={cn("flex min-h-14 flex-1 flex-col items-center justify-center gap-1 text-xs font-medium", active(i.href, i.exact) ? "text-accent-foreground" : "text-muted-foreground")}>
                <span className={cn("flex h-8 w-14 items-center justify-center rounded-full", active(i.href, i.exact) && "bg-brand text-brand-foreground")}><i.icon className="size-5" aria-hidden="true" /></span>
                {i.label.split(" ")[0]}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    );
  }
  return (
    <nav aria-label="Doctor" className="flex flex-col gap-1 px-3">
      {ITEMS.map((i) => (
        <Link key={i.href} href={i.href} aria-current={active(i.href, i.exact) ? "page" : undefined} className={cn("flex min-h-11 items-center gap-3 rounded-xl px-3 text-base font-medium transition-colors", active(i.href, i.exact) ? "bg-sidebar-accent font-semibold text-sidebar-accent-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground")}>
          <i.icon className="size-5" aria-hidden="true" /> {i.label}
        </Link>
      ))}
    </nav>
  );
}
