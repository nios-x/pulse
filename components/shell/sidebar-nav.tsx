"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { MemberAvatar } from "@/components/health/member-avatar";
import { cn } from "@/lib/utils";
import { isActive, NAV } from "./nav";

export type NavMember = { id: string; name: string; relationLabel: string; avatarTone: number };

export function SidebarNav({ members }: { members: NavMember[] }) {
  const pathname = usePathname();
  return (
    <nav aria-label="Main" className="flex flex-1 flex-col gap-8 overflow-y-auto px-3 pb-6">
      <ul className="flex flex-col gap-1">
        {NAV.map((item) => {
          const active = isActive(pathname, item.href);
          const Icon = item.icon;
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex min-h-11 items-center gap-3 rounded-lg px-3 text-base font-medium transition-colors duration-150",
                  active
                    ? "bg-sidebar-accent text-sidebar-accent-foreground"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                <Icon className="size-5 shrink-0" aria-hidden="true" />
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
      {members.length > 0 && (
        <div>
          <p className="px-3 pb-2 text-sm font-medium text-muted-foreground">Family</p>
          <ul className="flex flex-col gap-0.5">
            {members.map((m) => {
              const href = `/members/${m.id}`;
              const active = pathname.startsWith(href);
              return (
                <li key={m.id}>
                  <Link
                    href={href}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "flex min-h-11 items-center gap-3 rounded-lg px-2.5 py-1.5 transition-colors duration-150",
                      active ? "bg-sidebar-accent text-sidebar-accent-foreground" : "hover:bg-muted"
                    )}
                  >
                    <MemberAvatar name={m.name} tone={m.avatarTone} size="sm" />
                    <span className="min-w-0 leading-tight">
                      <span className="block truncate text-[0.9375rem] font-medium">{m.name.split(" ")[0]}</span>
                      <span className="block truncate text-xs text-muted-foreground">{m.relationLabel}</span>
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </nav>
  );
}
