import type { ReactNode } from "react";
import { getT } from "@/lib/i18n-server";
import { AppMenu } from "@/components/shell/app-menu";
import { BottomNav } from "@/components/shell/bottom-nav";
import { LanguageSwitch } from "@/components/shell/language-switch";
import { SignOutButton } from "@/components/shell/sign-out-button";

type ShellPatient = { id: string; name?: string } | null;

/** Mobile shell: header with the patient's name, page content, bottom nav. */
export async function AppShell({
  patient,
  children,
}: {
  patient: ShellPatient;
  children: ReactNode;
}) {
  const { t } = await getT();
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
        <AppMenu>
          <LanguageSwitch className="mt-2 mb-4" />
          <SignOutButton />
        </AppMenu>
      </header>
      <main className="flex-1 px-4 pt-4 pb-28">{children}</main>
      <BottomNav patientId={patient?.id ?? null} />
    </div>
  );
}
