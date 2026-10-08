import Link from "next/link";
import type { ReactNode } from "react";
import { DropletIcon, FootprintsIcon, PillIcon, TargetIcon, type LucideIcon } from "lucide-react";
import { SafetyNote } from "@/components/health/safety-note";
import { StatusBadge } from "@/components/health/status-badge";
import { VitalChart, type VitalPoint } from "@/components/health/vital-chart";
import type { Patient } from "@/db/schema";
import { CHART_DAYS, WEEK_DAYS, type loadDashboard } from "@/lib/dashboard";
import { istDate } from "@/lib/dates";
import { formatDay, formatTime } from "@/lib/format";
import type { Locale, Translate } from "@/lib/i18n";
import { GLUCOSE_TARGET, glucoseStatus } from "@/lib/vitals";

type Dashboard = Awaited<ReturnType<typeof loadDashboard>>;

function Tile({
  icon: Icon,
  label,
  figure,
  unit,
  children,
}: {
  icon: LucideIcon;
  label: string;
  figure: ReactNode;
  unit?: string;
  children: ReactNode;
}) {
  return (
    <article className="sheet flex min-w-0 flex-col gap-3 rounded-2xl p-4">
      <h3 className="flex items-center gap-2 font-heading text-sm font-medium text-ink-3">
        <span className="well grid size-8 shrink-0 place-items-center rounded-full text-violet">
          <Icon className="size-4" aria-hidden />
        </span>
        {label}
      </h3>
      <p className="flex items-baseline gap-1.5">
        <span className="figure text-[2rem]">{figure}</span>
        {unit ? <span className="text-sm text-ink-3">{unit}</span> : null}
      </p>
      <div className="mt-auto text-sm leading-snug text-ink-2">{children}</div>
    </article>
  );
}

/** Home dashboard: two weeks of fasting sugar, then four one-week numbers in a 2×2 grid. */
export function WeekStats({
  data,
  patient,
  today,
  t,
  locale,
}: {
  data: Dashboard;
  patient: Patient;
  today: string;
  t: Translate;
  locale: Locale;
}) {
  const { series, latest, inRange, doses, walkedDays } = data;
  const [fastLow, fastHigh] = GLUCOSE_TARGET.fasting;
  const points: VitalPoint[] | null = series?.some((p) => p.mgdl !== null)
    ? series.map((p) => ({ date: p.date, label: formatDay(p.date, locale), mgdl: p.mgdl }))
    : null;
  const status = latest ? glucoseStatus(latest.mgdl, latest.context, patient) : null;

  return (
    <section aria-labelledby="week-heading" className="flex flex-col gap-3">
      <h2 id="week-heading" className="text-xl font-semibold">
        {t("home.weekStats")}
      </h2>

      {series ? (
        <div className="sheet flex flex-col gap-3 rounded-2xl p-4 pt-5">
          <div className="flex items-baseline justify-between gap-3">
            <h3 className="font-heading text-base font-semibold text-plum">
              {t("home.chartTitle", { days: CHART_DAYS })}
            </h3>
            <Link href={`/p/${patient.id}/vitals`} className="action-link shrink-0 py-2">
              {t("home.chartMore")}
            </Link>
          </div>
          {points ? (
            <VitalChart
              data={points}
              series={[{ key: "mgdl", label: t("insights.fastingMgdl"), color: "var(--chart-1)" }]}
              bands={[{ from: fastLow, to: fastHigh, label: t("vitals.sugarBand", { low: fastLow, high: fastHigh }) }]}
              unit="mg/dL"
              caption={t("home.chartTitle", { days: CHART_DAYS })}
              className="-mx-1"
            />
          ) : (
            <p className="py-6 text-center text-ink-3">{t("home.chartEmpty", { days: CHART_DAYS })}</p>
          )}
        </div>
      ) : null}

      <div className="grid grid-cols-2 gap-3">
        {latest !== undefined ? (
          <Tile icon={DropletIcon} label={t("home.stat.latest")} figure={latest?.mgdl ?? "–"} unit={latest ? "mg/dL" : undefined}>
            {latest && status ? (
              <span className="flex flex-col gap-1.5">
                <StatusBadge tone={status.tone} size="sm">
                  {t(`vital.${status.label}`)}
                </StatusBadge>
                <span>
                  {t(`context.${latest.context}`)} ·{" "}
                  {istDate(latest.measuredAt) === today
                    ? formatTime(latest.measuredAt, locale)
                    : formatDay(istDate(latest.measuredAt), locale)}
                </span>
              </span>
            ) : (
              t("home.stat.noReading")
            )}
          </Tile>
        ) : null}

        {inRange !== undefined ? (
          <Tile icon={TargetIcon} label={t("home.stat.inRange")} figure={inRange ? `${inRange.percent}%` : "–"}>
            {inRange
              ? t("home.stat.inRangeOf", { ok: inRange.ok, total: inRange.total })
              : t("home.stat.noWeekReadings")}
          </Tile>
        ) : null}

        {doses !== undefined ? (
          <Tile
            icon={PillIcon}
            label={t("home.stat.doses")}
            figure={doses?.percent !== null && doses ? `${doses.percent}%` : "–"}
          >
            {doses && doses.percent !== null
              ? t("home.stat.dosesOf", { taken: doses.taken, total: doses.taken + doses.missed })
              : t("home.stat.noDoses")}
          </Tile>
        ) : null}

        <Tile icon={FootprintsIcon} label={t("home.stat.walked")} figure={walkedDays} unit={`/ ${WEEK_DAYS}`}>
          {t("home.stat.walkedOf")}
        </Tile>
      </div>

      {latest ? <SafetyNote>{t("safety.notDiagnosis")}</SafetyNote> : null}
    </section>
  );
}
