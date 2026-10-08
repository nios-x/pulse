import Link from "next/link";
import { HeartHandshakeIcon, PencilLineIcon } from "lucide-react";
import { TodayTimeline } from "@/components/home/today-timeline";
import { DueNowSection } from "@/components/meds/due-now-section";
import { AppShell } from "@/components/shell/app-shell";
import { JoinCodeForm } from "@/components/profile/join-code-form";
import { PatientSwitcher } from "@/components/profile/patient-switcher";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { requireUser } from "@/lib/auth";
import { istDate, istMinutes } from "@/lib/dates";
import { formatDay } from "@/lib/format";
import { getT } from "@/lib/i18n-server";
import { now } from "@/lib/now";
import { loadMeds } from "@/lib/meds";
import { listMyPatients } from "@/lib/patients";
import { requirePermission } from "@/lib/permissions";
import { getDayTimeline } from "@/lib/timeline";

export default async function HomePage({ searchParams }: PageProps<"/home">) {
  const user = await requireUser();
  const { t, locale } = await getT();
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
  const current = await now();
  const today = istDate(current);
  const clock = { today, nowMinutes: istMinutes(current) };
  const [timeline, medsToday] = await Promise.all([
    getDayTimeline(active.id, today, access.permissions),
    access.permissions.mark_dose ? loadMeds(active.id, today) : null,
  ]);
  return (
    <AppShell patient={access.patient}>
      <PatientSwitcher patients={patients} activeId={active.id} />
      <div className="flex items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">{t("page.home")}</h1>
          <p className="text-muted-foreground">{formatDay(today, locale, true)}</p>
        </div>
        <Link href={`/p/${active.id}/log`} className={buttonVariants({ size: "touch" })}>
          <PencilLineIcon aria-hidden />
          {t("home.logNow")}
        </Link>
      </div>

      {medsToday ? (
        <div className="mt-6">
          <DueNowSection patientId={active.id} meds={medsToday.meds} logs={medsToday.logs} clock={clock} />
        </div>
      ) : null}

      <section aria-labelledby="timeline-heading" className="mt-6 flex flex-col gap-3">
        <h2 id="timeline-heading" className="text-lg font-semibold">
          {t("home.timeline")}
        </h2>
        <TodayTimeline
          items={timeline.items}
          viewerId={user.id}
          ownerUserId={timeline.ownerUserId}
          patientName={access.patient.name}
        />
      </section>

      <p className="mt-6 text-sm text-muted-foreground">
        {t(`role.${access.membership.role}.you`, { name: access.patient.name })}
      </p>
      <div className="mt-6 border-t pt-6">
        <JoinCodeForm />
      </div>
    </AppShell>
  );
}
