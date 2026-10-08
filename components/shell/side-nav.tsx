"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { HouseIcon, type LucideIcon } from "lucide-react";
import { useT } from "@/components/i18n-provider";
import { MemberAvatar } from "@/components/health/member-avatar";
import { PROFILE_SECTIONS, sectionHref, type NavMember } from "@/components/shell/nav-sections";
import { cn } from "@/lib/utils";

function Row({
  href,
  active,
  icon: Icon,
  children,
}: {
  href: string;
  active: boolean;
  icon: LucideIcon;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "group relative flex h-11 items-center gap-3 rounded-xl px-3 text-[0.9375rem] font-medium transition-colors duration-150",
        active ? "well text-ink" : "text-ink-2 hover:bg-well/70 hover:text-ink"
      )}
    >
      {active ? <span aria-hidden className="absolute top-2.5 -left-4 h-6 w-[3px] rounded-r-full bg-sage" /> : null}
      <Icon className={cn("size-5 shrink-0", active ? "text-sage" : "text-ink-3 group-hover:text-ink-2")} aria-hidden />
      {children}
    </Link>
  );
}

/** Desktop rail: the family first, then the open member's health sections. */
export function SideNav({ members, activeId }: { members: NavMember[]; activeId: string | null }) {
  const t = useT();
  const pathname = usePathname();
  const onHome = pathname === "/home";
  const active = members.find((m) => m.id === activeId) ?? null;
  const base = active ? `/p/${active.id}` : null;
  const rest = base && pathname.startsWith(base) ? pathname.slice(base.length).replace(/^\//, "") : null;

  return (
    <nav aria-label={t("nav.main")} className="flex flex-col gap-6">
      <Row href={active ? `/home?p=${active.id}` : "/home"} active={onHome} icon={HouseIcon}>
        {t("nav.home")}
      </Row>

      <div className="flex flex-col gap-1">
        <p className="px-3 pb-1 text-sm font-medium text-ink-3">{t("nav.members")}</p>
        <ul className="flex flex-col gap-0.5">
          {members.map((m) => {
            const current = m.id === activeId;
            return (
              <li key={m.id}>
                <Link
                  href={`/p/${m.id}`}
                  aria-current={m.id === activeId && !onHome ? "true" : undefined}
                  className={cn(
                    "flex min-h-12 items-center gap-3 rounded-xl px-2 py-1.5 transition-colors duration-150",
                    current && !onHome ? "bg-sage-wash" : "hover:bg-well/70"
                  )}
                >
                  <MemberAvatar name={m.name} index={m.index} size="sm" />
                  <span className="flex min-w-0 flex-col leading-tight">
                    <span className="truncate text-[0.9375rem] font-semibold">{m.name.split(" ")[0]}</span>
                    <span className="truncate text-sm text-ink-3">{t(`approle.${m.appRole}`)}</span>
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </div>

      {active ? (
        <div className="flex flex-col gap-1">
          <p className="px-3 pb-1 text-sm font-medium text-ink-3">{t("nav.forMember", { name: active.name.split(" ")[0] })}</p>
          {PROFILE_SECTIONS.map((s) => (
            <Row
              key={s.segment}
              href={sectionHref(active.id, s.segment)}
              active={rest !== null && (s.segment === "" ? rest === "" : rest.startsWith(s.segment))}
              icon={s.icon}
            >
              {t(s.key)}
            </Row>
          ))}
        </div>
      ) : null}
    </nav>
  );
}
