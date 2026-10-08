import type { ReactNode } from "react";
import Link from "next/link";
import { BellIcon, LifeBuoyIcon, LineChartIcon, SettingsIcon, StethoscopeIcon, SunIcon, type LucideIcon } from "lucide-react";
import { getT } from "@/lib/i18n-server";
import { countUnread } from "@/lib/alerts";
import { getAccess } from "@/lib/permissions";
import { CornerLeaf, PulseMark } from "@/components/shapes/shapes";
import { AlertBell } from "@/components/shell/alert-bell";
import { AppMenu } from "@/components/shell/app-menu";
import { BottomNav } from "@/components/shell/bottom-nav";
import { LanguageSwitch } from "@/components/shell/language-switch";
import { PushToggle } from "@/components/shell/push-toggle";
import { SignOutButton } from "@/components/shell/sign-out-button";

type ShellPatient = { id: string; name?: string } | null;

function MenuLink({ href, icon: Icon, children }: { href: string; icon: LucideIcon; children: ReactNode }) {
  return (
    <Link
      href={href}
      className="group flex h-13 items-center gap-3.5 rounded-xl px-3 text-base font-medium text-plum transition-colors hover:bg-violet-wash"
    >
      <span className="flex size-9 items-center justify-center rounded-lg bg-violet-wash text-violet transition-colors group-hover:bg-white">
        <Icon className="size-5" aria-hidden />
      </span>
      {children}
    </Link>
  );
}

/** Mobile shell: brand row with the patient's name over a corner leaf, bell and menu; page; bottom nav. */
export async function AppShell({
  patient,
  children,
}: {
  patient: ShellPatient;
  children: ReactNode;
}) {
  const { t } = await getT();
  const access = patient ? await getAccess(patient.id) : null;
  const can = access?.permissions;
  const unread = access && can?.receive_alerts ? await countUnread(access.patient.id, access.membership.role) : null;

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col overflow-x-clip">
      <header className="no-print relative flex h-16 items-center gap-2 pr-3 pl-4">
        <CornerLeaf className="-top-20 -right-20" />
        <PulseMark className="size-10" />
        <div className="relative min-w-0 flex-1">
          <p className="flex items-center gap-1.5 font-heading text-xs leading-none font-semibold tracking-[0.08em] text-violet uppercase">
            {t("app.name")}
            {access?.patient.synthetic ? (
              <span className="rounded-full bg-warning/40 px-1.5 py-px text-[0.65rem] tracking-normal text-warning-foreground normal-case">
                {t("demo.synthetic")}
              </span>
            ) : null}
          </p>
          <p className="mt-0.5 truncate font-heading text-base leading-tight font-semibold text-plum">
            {patient?.name ?? t("app.tagline")}
          </p>
        </div>
        {patient && unread !== null ? <AlertBell patientId={patient.id} initialCount={unread} /> : null}
        <AppMenu>
          <Link
            href="/help"
            className="mb-3 flex h-14 items-center gap-3.5 rounded-xl bg-alert-wash px-3 text-base font-semibold text-alert-ink"
          >
            <span className="flex size-9 items-center justify-center rounded-lg bg-white text-alert">
              <LifeBuoyIcon className="size-5" aria-hidden />
            </span>
            {t("help.menu")}
          </Link>
          {patient && can?.view_insights ? (
            <MenuLink href={`/p/${patient.id}/insights`} icon={LineChartIcon}>
              {t("insights.title")}
            </MenuLink>
          ) : null}
          {patient && can?.receive_alerts ? (
            <MenuLink href={`/p/${patient.id}/alerts`} icon={BellIcon}>
              {t("alerts.title")}
            </MenuLink>
          ) : null}
          {patient && can?.create_share_link ? (
            <MenuLink href={`/p/${patient.id}/share`} icon={StethoscopeIcon}>
              {t("share.title")}
            </MenuLink>
          ) : null}
          {patient && can?.answer_mood ? (
            <MenuLink href={`/p/${patient.id}/check`} icon={SunIcon}>
              {t("check.menu")}
            </MenuLink>
          ) : null}
          {patient && can?.edit_patient ? (
            <MenuLink href={`/p/${patient.id}/settings`} icon={SettingsIcon}>
              {t("settings.title")}
            </MenuLink>
          ) : null}
          <PushToggle />
          <LanguageSwitch className="my-4" />
          <SignOutButton />
        </AppMenu>
      </header>
      <main className="relative flex-1 px-4 pt-3 pb-32">{children}</main>
      <BottomNav patientId={patient?.id ?? null} />
    </div>
  );
}
