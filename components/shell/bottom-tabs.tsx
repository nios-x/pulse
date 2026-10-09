"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Ellipsis } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { MemberAvatar } from "@/components/health/member-avatar";
import { cn } from "@/lib/utils";
import { isActive, NAV } from "./nav";
import type { NavMember } from "./sidebar-nav";

/** Mobile navigation: four tabs and a "More" sheet. */
export function BottomTabs({ members }: { members: NavMember[] }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const primary = NAV.filter((n) => n.mobile);
  const more = NAV.filter((n) => !n.mobile);
  const moreActive = more.some((n) => isActive(pathname, n.href)) || pathname.startsWith("/members");

  const tab = "flex min-h-14 flex-1 flex-col items-center justify-center gap-1 rounded-lg text-xs font-medium transition-colors duration-150";

  return (
    <>
      <nav
        aria-label="Main"
        className="no-print fixed inset-x-0 bottom-0 z-40 border-t border-border bg-card/95 pb-safe backdrop-blur supports-backdrop-filter:bg-card/85 lg:hidden"
      >
        <ul className="mx-auto flex max-w-lg items-stretch gap-1 px-2 py-1.5">
          {primary.map((item) => {
            const active = isActive(pathname, item.href);
            const Icon = item.icon;
            return (
              <li key={item.href} className="flex flex-1">
                <Link href={item.href} aria-current={active ? "page" : undefined} className={cn(tab, active ? "text-primary" : "text-muted-foreground hover:text-foreground")}>
                  <span className={cn("flex h-8 w-14 items-center justify-center rounded-full transition-colors", active && "bg-accent")}>
                    <Icon className="size-5" aria-hidden="true" />
                  </span>
                  {item.label}
                </Link>
              </li>
            );
          })}
          <li className="flex flex-1">
            <button type="button" onClick={() => setOpen(true)} aria-haspopup="dialog" className={cn(tab, "cursor-pointer", moreActive ? "text-primary" : "text-muted-foreground hover:text-foreground")}>
              <span className={cn("flex h-8 w-14 items-center justify-center rounded-full", moreActive && "bg-accent")}>
                <Ellipsis className="size-5" aria-hidden="true" />
              </span>
              More
            </button>
          </li>
        </ul>
      </nav>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="bottom" className="max-h-[85dvh] overflow-y-auto rounded-t-2xl pb-safe">
          <SheetHeader className="px-5 pt-5">
            <SheetTitle className="text-lg font-semibold">More</SheetTitle>
          </SheetHeader>
          <div className="space-y-6 px-3 pb-6">
            <ul className="grid gap-1">
              {more.map((item) => {
                const Icon = item.icon;
                return (
                  <li key={item.href}>
                    <Link href={item.href} onClick={() => setOpen(false)} className="flex min-h-12 items-center gap-3 rounded-lg px-3 text-base font-medium hover:bg-muted">
                      <Icon className="size-5 text-muted-foreground" aria-hidden="true" />
                      {item.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
            {members.length > 0 && (
              <div>
                <p className="px-3 pb-2 text-sm font-medium text-muted-foreground">Family</p>
                <ul className="grid grid-cols-2 gap-1">
                  {members.map((m) => (
                    <li key={m.id}>
                      <Link href={`/members/${m.id}`} onClick={() => setOpen(false)} className="flex min-h-12 items-center gap-2.5 rounded-lg px-2.5 hover:bg-muted">
                        <MemberAvatar name={m.name} tone={m.avatarTone} size="sm" />
                        <span className="min-w-0 truncate text-base font-medium">{m.name.split(" ")[0]}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
