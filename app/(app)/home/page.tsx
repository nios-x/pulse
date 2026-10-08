import Link from "next/link";
import { desc, eq } from "drizzle-orm";
import { ChevronLeftIcon, ChevronRightIcon, HeartHandshakeIcon, LineChartIcon, PencilLineIcon, SunIcon } from "lucide-react";
import { db } from "@/db";
import { moodChecks } from "@/db/schema";
import { AssistantLink } from "@/components/assistant/assistant-link";
import { DoctorHome } from "@/components/doctor/doctor-home";
import { MonthCalendar } from "@/components/home/month-calendar";
import { TodayTimeline } from "@/components/home/today-timeline";
import { WeekStats } from "@/components/home/week-stats";
import { DueNowSection } from "@/components/meds/due-now-section";
import { CaregiverNotices } from "@/components/safety/caregiver-notices";
import { AppShell } from "@/components/shell/app-shell";
import { JoinCodeForm } from "@/components/profile/join-code-form";
import { PatientSwitcher } from "@/components/profile/patient-switcher";
import { buttonVariants } from "@/components/ui/button";
import { Blob, BlobBadge, PebbleScatter, WaveField } from "@/components/shapes/shapes";
import { requireUser } from "@/lib/auth";
import { loadDashboard, loadMonthMarks } from "@/lib/dashboard";
import { parseMonth } from "@/lib/day-marks";
import { addDays, istDate, istMinutes, weekday } from "@/lib/dates";
import { formatDay } from "@/lib/format";
import { getT } from "@/lib/i18n-server";
import { now } from "@/lib/now";
import { loadMeds } from "@/lib/meds";
import { listMyPatients } from "@/lib/patients";
import { canLog, requirePermission } from "@/lib/permissions";
import { getDayTimeline } from "@/lib/timeline";

export default async function HomePage({ searchParams }: PageProps<"/home">) {
  const user = await requireUser();
  const { t, locale } = await getT();
  const { p, m, d } = await searchParams;

  // A doctor lands on their list of patients and opens one from there.
  if (user.isDoctor && typeof p !== "string") {
    return (
      <AppShell patient={null}>
        <DoctorHome />
      </AppShell>
    );
  }

  const patients = await listMyPatients(user.id);
  const active = patients.find((x) => x.id === p) ?? patients[0] ?? null;

  if (!active) {
    return (
      <AppShell patient={null}>
        <h1 className="text-[2rem] leading-tight">{t("home.welcome", { name: user.name })}</h1>
        <section className="sheet relative mt-6 overflow-hidden rounded-2xl p-5 pt-6">
          <PebbleScatter />
          <BlobBadge seed={8} className="relative size-20">
            <HeartHandshakeIcon aria-hidden />
          </BlobBadge>
          <p className="relative mt-4 text-lg text-plum">{t("home.emptyBody")}</p>
          <div className="relative mt-5">
            <JoinCodeForm />
          </div>
        </section>
      </AppShell>
    );
  }

  const access = await requirePermission(active.id, "view_summary");
  const current = await now();
  const today = istDate(current);
  const clock = { today, nowMinutes: istMinutes(current) };
  const can = access.permissions;
  const month = parseMonth(m, today);
  const [timeline, dashboard, monthMarks, medsToday, [lastCheck]] = await Promise.all([
    getDayTimeline(active.id, today, can),
    loadDashboard(access.patient, clock, can),
    loadMonthMarks(access.patient, month, clock, can),
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
      {user.isDoctor ? (
        <Link href="/home" className="-ml-1 mb-2 flex min-h-11 w-fit items-center gap-1 text-base font-semibold text-violet hover:underline">
          <ChevronLeftIcon className="size-5" aria-hidden />
          {t("doctorHome.allPatients")}
        </Link>
      ) : null}
      <PatientSwitcher patients={patients} activeId={active.id} />
      <div className="flex items-end justify-between gap-3">
        <div>
          <p className="font-heading text-sm font-medium text-ink-3">{formatDay(today, locale, true)}</p>
          <h1 className="text-[2rem] leading-tight">{t("page.home")}</h1>
        </div>
        {canLog(can) ? (
          <Link href={`/p/${active.id}/log`} className={buttonVariants({ size: "touch", className: "rounded-full px-5" })}>
            <PencilLineIcon aria-hidden />
            {t("home.logNow")}
          </Link>
        ) : null}
      </div>

      {access.membership.role === "caregiver" ? (
        <div className="mt-6">
          <CaregiverNotices patient={access.patient} now={current} />
        </div>
      ) : null}

      {checkDue ? (
        <Link
          href={`/p/${active.id}/check`}
          className="sheet relative mt-6 flex items-center gap-4 overflow-hidden rounded-2xl p-4 pr-5 transition-shadow hover:shadow-lift"
        >
          <Blob seed={55} className="absolute -right-8 -bottom-10 w-28 text-watch-wash" />
          <BlobBadge seed={56} tone="white" className="relative size-14 bg-transparent text-watch">
            <SunIcon aria-hidden />
          </BlobBadge>
          <span className="relative flex flex-col">
            <span className="font-heading text-base font-semibold text-plum">{t("check.promptTitle")}</span>
            <span className="text-sm text-ink-2">{t("check.promptBody")}</span>
          </span>
        </Link>
      ) : null}

      {medsToday ? (
        <div className="mt-6">
          <DueNowSection patientId={active.id} meds={medsToday.meds} logs={medsToday.logs} clock={clock} compact />
        </div>
      ) : null}

      <div className="mt-6">
        <WeekStats data={dashboard} patient={access.patient} today={today} t={t} locale={locale} />
      </div>

      {monthMarks ? (
        <div id="calendar" className="mt-6 scroll-mt-4">
          <MonthCalendar
            marks={monthMarks}
            month={month}
            today={today}
            selected={typeof d === "string" ? d : month === today.slice(0, 7) ? today : null}
            patientId={active.id}
            t={t}
            locale={locale}
          />
        </div>
      ) : null}

      <section aria-labelledby="timeline-heading" className="mt-6 flex flex-col gap-3">
        <h2 id="timeline-heading" className="text-xl font-semibold">
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
          className="relative mt-6 flex items-center gap-4 overflow-hidden rounded-2xl bg-violet p-4 pr-5 text-white shadow-violet transition-transform hover:-translate-y-0.5"
        >
          <WaveField seed={61} edge={false} className="opacity-80" />
          <BlobBadge seed={62} tone="white" className="relative size-14">
            <LineChartIcon aria-hidden />
          </BlobBadge>
          <span className="relative flex-1 font-heading text-base font-semibold">{t("home.insightsLink")}</span>
          <ChevronRightIcon className="relative size-5" aria-hidden />
        </Link>
      ) : null}

      {lastCheck ? (
        <p className="mt-6 flex items-center gap-3 rounded-2xl bg-watch-wash px-4 py-3 text-base text-plum">
          <SunIcon className="size-5 shrink-0 text-watch-ink" aria-hidden />
          {t(access.membership.role === "owner" ? "check.lastOwn" : "check.lastShared", {
            name: access.patient.name,
            score: lastCheck.score,
            date: formatDay(istDate(lastCheck.checkedAt), locale),
          })}
        </p>
      ) : null}

      <AssistantLink patientId={active.id} className="mt-6" />

      <p className="mt-8 text-sm text-ink-3">
        {t(`role.${access.membership.role}.you`, { name: access.patient.name })}
      </p>
      <div className="sheet mt-4 rounded-2xl p-4">
        <JoinCodeForm />
      </div>
    </AppShell>
  );
}
