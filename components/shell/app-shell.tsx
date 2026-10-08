import type { ReactNode } from "react";
import Link from "next/link";
import { BellIcon, LifeBuoyIcon, SunIcon, type LucideIcon } from "lucide-react";
import { getT } from "@/lib/i18n-server";
import { countUnread } from "@/lib/alerts";
import { getAccess } from "@/lib/permissions";
import { AlertBell } from "@/components/shell/alert-bell";
import { AppMenu } from "@/components/shell/app-menu";
import { BottomNav } from "@/components/shell/bottom-nav";
import { LanguageSwitch } from "@/components/shell/language-switch";
import { SignOutButton } from "@/components/shell/sign-out-button";

type ShellPatient = { id: string; name?: string } | null;

function MenuLink({ href, icon: Icon, children }: { href: string; icon: LucideIcon; children: ReactNode }) {
  return (
    <Link href={href} className="flex h-12 items-center gap-3 rounded-lg px-3 text-base hover:bg-muted">
      <Icon className="size-5 text-muted-foreground" aria-hidden />
      {children}
    </Link>
  );
}

/** Mobile shell: header with the patient's name, bell and menu; page content; bottom nav. */
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
    <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col">
      <header className="no-print sticky top-0 z-30 flex h-14 items-center gap-1 border-b bg-background/95 pr-2 pl-4 backdrop-blur">
        <div className="min-w-0 flex-1">
          <p className="text-xs leading-none font-medium tracking-wide text-primary">
            {t("app.name")}
          </p>
          <p className="truncate text-lg leading-tight font-semibold">
            {patient?.name ?? t("app.tagline")}
          </p>
        </div>
        {patient && unread !== null ? <AlertBell patientId={patient.id} initialCount={unread} /> : null}
        <AppMenu>
          <Link
            href="/help"
            className="mb-2 flex h-12 items-center gap-3 rounded-lg bg-destructive/10 px-3 text-base font-semibold text-destructive"
          >
            <LifeBuoyIcon className="size-5" aria-hidden />
            {t("help.menu")}
          </Link>
          {patient && can?.receive_alerts ? (
            <MenuLink href={`/p/${patient.id}/alerts`} icon={BellIcon}>
              {t("alerts.title")}
            </MenuLink>
          ) : null}
          {patient && can?.answer_mood ? (
            <MenuLink href={`/p/${patient.id}/check`} icon={SunIcon}>
              {t("check.menu")}
            </MenuLink>
          ) : null}
          <LanguageSwitch className="my-4" />
          <SignOutButton />
        </AppMenu>
      </header>
      <main className="flex-1 px-4 pt-4 pb-28">{children}</main>
      <BottomNav patientId={patient?.id ?? null} />
    </div>
  );
}
