import Link from "next/link";
import { HeartHandshakeIcon } from "lucide-react";
import { AppShell } from "@/components/shell/app-shell";
import { JoinCodeForm } from "@/components/profile/join-code-form";
import { PatientSwitcher } from "@/components/profile/patient-switcher";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { requireUser } from "@/lib/auth";
import { getT } from "@/lib/i18n-server";
import { listMyPatients } from "@/lib/patients";
import { requirePermission } from "@/lib/permissions";

export default async function HomePage({ searchParams }: PageProps<"/home">) {
  const user = await requireUser();
  const { t } = await getT();
  const { p } = await searchParams;
  const patients = await listMyPatients(user.id);
  const active = patients.find((x) => x.id === p) ?? patients[0] ?? null;

  if (!active) {
    return (
      <AppShell patient={null}>
        <h1 className="text-2xl font-semibold">{t("home.welcome", { name: user.name })}</h1>
        <Card className="mt-5">
          <CardContent className="flex flex-col gap-4">
            <HeartHandshakeIcon className="size-10 text-primary" aria-hidden />
            <p className="text-lg">{t("home.emptyBody")}</p>
            <Link href="/new" className={buttonVariants({ size: "xl" })}>
              {t("home.createProfile")}
            </Link>
          </CardContent>
        </Card>
        <div className="mt-6">
          <JoinCodeForm />
        </div>
      </AppShell>
    );
  }

  const access = await requirePermission(active.id, "view_summary");
  return (
    <AppShell patient={access.patient}>
      <PatientSwitcher patients={patients} activeId={active.id} />
      <h1 className="text-2xl font-semibold">{t("page.home")}</h1>
      <p className="mt-1 text-muted-foreground">
        {t(`role.${access.membership.role}.you`, { name: access.patient.name })}
      </p>
      <div className="mt-8 border-t pt-6">
        <JoinCodeForm />
      </div>
    </AppShell>
  );
}
