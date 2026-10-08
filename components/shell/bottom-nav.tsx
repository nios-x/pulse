"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { HouseIcon, PencilLineIcon, PillIcon, UsersIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { useT } from "@/components/i18n-provider";
import type { MessageKey } from "@/lib/i18n";

const ITEMS: { key: MessageKey; segment: string; icon: typeof HouseIcon }[] = [
  { key: "nav.home", segment: "home", icon: HouseIcon },
  { key: "nav.log", segment: "log", icon: PencilLineIcon },
  { key: "nav.meds", segment: "meds", icon: PillIcon },
  { key: "nav.family", segment: "family", icon: UsersIcon },
];

export function BottomNav({ patientId }: { patientId: string | null }) {
  const t = useT();
  const pathname = usePathname();

  return (
    <nav
      aria-label={t("nav.main")}
      className="no-print fixed inset-x-0 bottom-0 z-30 border-t bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur"
    >
      <ul className="mx-auto grid max-w-md grid-cols-4">
        {ITEMS.map(({ key, segment, icon: Icon }) => {
          const href =
            segment === "home"
              ? patientId
                ? `/home?p=${patientId}`
                : "/home"
              : patientId
                ? `/p/${patientId}/${segment}`
                : null;
          const active =
            segment === "home" ? pathname === "/home" : pathname.endsWith(`/${segment}`);
          const className = cn(
            "flex h-16 flex-col items-center justify-center gap-0.5 text-sm font-medium",
            active ? "text-primary" : "text-muted-foreground",
            !href && "opacity-40"
          );
          return (
            <li key={key}>
              {href ? (
                <Link href={href} className={className} aria-current={active ? "page" : undefined}>
                  <Icon className={cn("size-6", active && "stroke-[2.5]")} aria-hidden />
                  {t(key)}
                </Link>
              ) : (
                <span className={className} aria-disabled>
                  <Icon className="size-6" aria-hidden />
                  {t(key)}
                </span>
              )}
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
