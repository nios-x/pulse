"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { HouseIcon, PencilLineIcon, PillIcon, StethoscopeIcon, UsersIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { useT } from "@/components/i18n-provider";
import { Blob } from "@/components/shapes/shapes";
import type { MessageKey } from "@/lib/i18n";

const ITEMS: { key: MessageKey; segment: string; icon: typeof HouseIcon; seed: number }[] = [
  { key: "nav.home", segment: "home", icon: HouseIcon, seed: 41 },
  { key: "nav.log", segment: "log", icon: PencilLineIcon, seed: 42 },
  { key: "nav.meds", segment: "meds", icon: PillIcon, seed: 43 },
  // Book an appointment and join the call with the doctor.
  { key: "nav.doctor", segment: "doctor", icon: StethoscopeIcon, seed: 45 },
  { key: "nav.family", segment: "family", icon: UsersIcon, seed: 44 },
];

/** `canLog` false (a doctor) drops the Log tab: doctors only read, book calls and call. */
export function BottomNav({ patientId, canLog = true }: { patientId: string | null; canLog?: boolean }) {
  const t = useT();
  const pathname = usePathname();
  const items = canLog ? ITEMS : ITEMS.filter((i) => i.segment !== "log");

  return (
    <nav
      aria-label={t("nav.main")}
      className="no-print fixed inset-x-0 bottom-0 z-30 pb-[env(safe-area-inset-bottom)]"
    >
      <ul
        className={cn(
          "mx-auto grid max-w-md rounded-t-3xl bg-card px-2 pt-1 shadow-[0_-10px_30px_-18px_rgb(45_12_87/0.35)]",
          items.length === 5 ? "grid-cols-5" : "grid-cols-4"
        )}
      >
        {items.map(({ key, segment, icon: Icon, seed }) => {
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
            "group flex h-17 flex-col items-center justify-center gap-0.5 font-heading text-[0.8125rem] font-medium transition-colors",
            active ? "text-violet-deep" : "text-ink-3 hover:text-plum",
            !href && "opacity-40"
          );
          const icon = (
            <span className="relative flex size-10 items-center justify-center">
              <Blob
                seed={seed}
                wobble={0.16}
                className={cn(
                  "absolute inset-0 size-full text-lilac transition-[transform,opacity] duration-300 ease-(--ease-out-expo)",
                  active ? "scale-100 opacity-100" : "scale-50 opacity-0"
                )}
              />
              <Icon className={cn("relative size-[1.375rem]", active && "stroke-[2.4] text-violet")} aria-hidden />
            </span>
          );
          return (
            <li key={key}>
              {href ? (
                <Link href={href} className={className} aria-current={active ? "page" : undefined}>
                  {icon}
                  <span className={cn(active && "font-semibold")}>{t(key)}</span>
                </Link>
              ) : (
                <span className={className} aria-disabled>
                  {icon}
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
