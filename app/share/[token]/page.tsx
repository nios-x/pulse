import type { Metadata } from "next";
import { HeartPulseIcon, LinkIcon } from "lucide-react";
import { FastingChart } from "@/components/charts/fasting-chart";
import { insightText } from "@/components/insights/insight-card";
import { PrintButton } from "@/components/share/print-button";
import { createT, type Locale } from "@/lib/i18n";
import { istDate } from "@/lib/dates";
import { formatDay } from "@/lib/format";
import { getSavedLocale } from "@/lib/i18n-server";
import { now } from "@/lib/now";
import { safetyText } from "@/lib/safety";
import { loadShareSummary, SUMMARY_DAYS } from "@/lib/share";

export const metadata: Metadata = {
  title: "Pulse · patient summary",
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

function Stat({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <div className="rounded-xl border bg-card px-3 py-2 print:py-1.5">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-2xl font-bold tabular-nums print:text-xl">{value}</p>
      {note ? <p className="text-xs text-muted-foreground">{note}</p> : null}
    </div>
  );
}

/** Doctor view: no login, read-only, one A4 page, readable in about 30 seconds. */
export default async function DoctorSummaryPage({ params }: PageProps<"/share/[token]">) {
  const { token } = await params;
  // Doctors usually read English; a saved language choice still wins.
  const locale: Locale = (await getSavedLocale()) ?? "en";
  const t = createT(locale);
  const summary = await loadShareSummary(token, await now());

  if (!summary) {
    return (
      <main className="mx-auto flex min-h-dvh max-w-md flex-col items-start justify-center gap-3 px-4">
        <LinkIcon className="size-10 text-muted-foreground" aria-hidden />
        <h1 className="text-2xl font-semibold">{t("share.inactive")}</h1>
        <p className="text-muted-foreground">{t("share.inactiveBody")}</p>
      </main>
    );
  }

  const { patient } = summary;
  const age = patient.birthYear ? Number(summary.today.slice(0, 4)) - patient.birthYear : null;
  const day = (d: string) => formatDay(d, locale);
  const series = summary.series.map((p) => ({ ...p, label: day(p.date) }));

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-4 px-4 py-6 text-sm print:max-w-none print:gap-3 print:p-0">
      <header className="flex items-start justify-between gap-3 border-b pb-3">
        <div>
          <p className="flex items-center gap-1.5 text-xs font-medium text-primary">
            <HeartPulseIcon className="size-4" aria-hidden />
            {t("doctor.kicker", { days: SUMMARY_DAYS })}
          </p>
          <h1 className="text-2xl font-bold">{patient.name}</h1>
          {patient.synthetic ? (
            <p className="mt-0.5 inline-block rounded bg-warning/40 px-1.5 text-xs font-medium text-warning-foreground">
              {t("demo.syntheticLong")}
            </p>
          ) : null}
          <p className="text-muted-foreground">
            {[age ? t("doctor.age", { age }) : null, patient.city, t("doctor.condition")].filter(Boolean).join(" · ")}
          </p>
        </div>
        <div className="text-right text-xs text-muted-foreground">
          <p>{t("doctor.period", { from: day(summary.from), to: day(summary.today) })}</p>
          <p>{t("doctor.validUntil", { date: day(istDate(summary.link.expiresAt)) })}</p>
          <div className="mt-2">
            <PrintButton label={t("doctor.print")} />
          </div>
        </div>
      </header>

      <section aria-label={t("doctor.keyNumbers")} className="grid grid-cols-2 gap-2 sm:grid-cols-4 print:grid-cols-4">
        <Stat
          label={t("doctor.fastingAvg")}
          value={summary.fastingAvg ? `${summary.fastingAvg}` : "–"}
          note={t("doctor.mgdlReadings", { count: summary.fastingCount })}
        />
        <Stat
          label={t("doctor.inRange")}
          value={summary.inRangePercent === null ? "–" : `${summary.inRangePercent}%`}
          note={t("doctor.inRangeNote", { low: patient.glucoseLow, high: patient.glucoseHigh, count: summary.readingCount })}
        />
        <Stat
          label={t("doctor.adherence")}
          value={summary.adherence.percent === null ? "–" : `${summary.adherence.percent}%`}
          note={t("doctor.adherenceNote", { taken: summary.adherence.taken, total: summary.adherence.taken + summary.adherence.missed })}
        />
        <Stat
          label={t("doctor.alerts")}
          value={`${summary.alerts.urgent + summary.alerts.warning}`}
          note={t("doctor.alertsNote", { urgent: summary.alerts.urgent, warning: summary.alerts.warning })}
        />
      </section>

      <section aria-labelledby="chart-h" className="rounded-xl border bg-card p-3 print:break-inside-avoid">
        <h2 id="chart-h" className="mb-1 font-semibold">
          {t("doctor.chartTitle", { days: SUMMARY_DAYS })}
        </h2>
        <FastingChart
          data={series}
          low={patient.glucoseLow}
          high={patient.glucoseHigh}
          seriesLabel={t("insights.fastingMgdl")}
          bandLabel={t("insights.targetRange")}
          dense
          className="h-48 print:h-40"
        />
      </section>

      <div className="grid gap-3 sm:grid-cols-2 print:grid-cols-2">
        <section aria-labelledby="hba1c-h" className="rounded-xl border bg-card p-3">
          <h2 id="hba1c-h" className="mb-1 font-semibold">
            HbA1c
          </h2>
          {summary.labs.length ? (
            <ul className="flex flex-col gap-0.5">
              {summary.labs.map((l) => (
                <li key={l.takenOn} className="flex justify-between tabular-nums">
                  <span>{day(l.takenOn)}</span>
                  <span className="font-semibold">{l.value}%</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-muted-foreground">{t("doctor.noLabs")}</p>
          )}
        </section>

        <section aria-labelledby="ins-h" className="rounded-xl border bg-card p-3">
          <h2 id="ins-h" className="mb-1 font-semibold">
            {t("doctor.patterns")}
          </h2>
          {summary.insights.length ? (
            <ul className="flex list-disc flex-col gap-1 pl-4">
              {summary.insights.map((i) => (
                <li key={i.kind}>{insightText(i, t, locale).body}</li>
              ))}
            </ul>
          ) : (
            <p className="text-muted-foreground">{t("doctor.noPatterns")}</p>
          )}
        </section>
      </div>

      {summary.link.includeMood ? (
        <section aria-labelledby="mood-h" className="rounded-xl border bg-card p-3">
          <h2 id="mood-h" className="mb-1 font-semibold">
            {t("doctor.moodTitle")}
          </h2>
          <p>
            {summary.mood
              ? t("doctor.moodScore", { score: summary.mood.score, date: day(istDate(summary.mood.checkedAt)) })
              : t("doctor.noMood")}
          </p>
        </section>
      ) : null}

      <footer className="border-t pt-2 text-xs text-muted-foreground">
        <p>{t("doctor.footer")}</p>
        <p>{safetyText("insight_disclaimer", locale)}</p>
      </footer>
    </main>
  );
}
