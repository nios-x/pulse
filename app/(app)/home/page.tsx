import Link from "next/link";
import { desc, eq } from "drizzle-orm";
import { ChevronRightIcon, HeartHandshakeIcon, LineChartIcon, PencilLineIcon, SunIcon } from "lucide-react";
import { db } from "@/db";
import { moodChecks } from "@/db/schema";
import { TodayTimeline } from "@/components/home/today-timeline";
import { DueNowSection } from "@/components/meds/due-now-section";
import { CaregiverNotices } from "@/components/safety/caregiver-notices";
import { AppShell } from "@/components/shell/app-shell";
import { JoinCodeForm } from "@/components/profile/join-code-form";
import { PatientSwitcher } from "@/components/profile/patient-switcher";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { requireUser } from "@/lib/auth";
import { addDays, istDate, istMinutes, weekday } from "@/lib/dates";
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
  const can = access.permissions;
  const [timeline, medsToday, [lastCheck]] = await Promise.all([
    getDayTimeline(active.id, today, can),
    can.mark_dose ? loadMeds(active.id, today) : null,
    can.view_mood
      ? db
          .select({ score: moodChecks.score, checkedAt: moodChecks.checkedAt })
          .from(moodChecks)
          .where(eq(moodChecks.patientId, active.id))
          .orderBy(desc(moodChecks.checkedAt))
          .limit(1)
      : [],
  ]);
  // Weekly check: a Monday prompt for the patient only, once a week.
  const checkDue =
    can.answer_mood &&
    weekday(today) === 1 &&
    (!lastCheck || istDate(lastCheck.checkedAt) < addDays(today, -5));
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

      {access.membership.role === "caregiver" ? (
        <div className="mt-6">
          <CaregiverNotices patient={access.patient} now={current} />
        </div>
      ) : null}

      {checkDue ? (
        <Link
          href={`/p/${active.id}/check`}
          className="mt-6 flex items-center gap-3 rounded-xl border border-chart-2/50 bg-chart-2/15 p-4"
        >
          <SunIcon className="size-8 shrink-0 text-chart-2" aria-hidden />
          <span className="flex flex-col">
            <span className="text-base font-semibold">{t("check.promptTitle")}</span>
            <span className="text-sm text-muted-foreground">{t("check.promptBody")}</span>
          </span>
        </Link>
      ) : null}

      {medsToday ? (
        <div className="mt-6">
          <DueNowSection patientId={active.id} meds={medsToday.meds} logs={medsToday.logs} clock={clock} compact />
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

      {can.view_insights ? (
        <Link
          href={`/p/${active.id}/insights`}
          className="mt-6 flex items-center gap-3 rounded-xl border bg-card p-4 hover:bg-muted"
        >
          <LineChartIcon className="size-6 shrink-0 text-chart-1" aria-hidden />
          <span className="flex-1 text-base font-medium">{t("home.insightsLink")}</span>
          <ChevronRightIcon className="size-5 text-muted-foreground" aria-hidden />
        </Link>
      ) : null}

      {lastCheck ? (
        <p className="mt-6 flex items-center gap-2 rounded-xl bg-muted px-4 py-3 text-base">
          <SunIcon className="size-5 shrink-0 text-chart-2" aria-hidden />
          {t(access.membership.role === "owner" ? "check.lastOwn" : "check.lastShared", {
            name: access.patient.name,
            score: lastCheck.score,
            date: formatDay(istDate(lastCheck.checkedAt), locale),
          })}
        </p>
      ) : null}

      <p className="mt-6 text-sm text-muted-foreground">
        {t(`role.${access.membership.role}.you`, { name: access.patient.name })}
      </p>
      <div className="mt-6 border-t pt-6">
        <JoinCodeForm />
      </div>
    </AppShell>
  );
}
