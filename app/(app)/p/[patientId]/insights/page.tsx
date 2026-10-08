import { LightbulbIcon } from "lucide-react";
import { FastingChart } from "@/components/charts/fasting-chart";
import { InsightCard } from "@/components/insights/insight-card";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { istDate, istMinutes } from "@/lib/dates";
import { formatDay } from "@/lib/format";
import { getT } from "@/lib/i18n-server";
import {
  afterDinnerReadingsNeeded,
  fastingSeries,
  fastingTrend,
  mealEffect,
  medicineEffect,
  walkEffect,
  type Insight,
} from "@/lib/insights";
import { loadInsightInputs } from "@/lib/insights-data";
import { now } from "@/lib/now";
import { requirePermission } from "@/lib/permissions";

export default async function InsightsPage({ params }: PageProps<"/p/[patientId]/insights">) {
  const { patientId } = await params;
  const { patient } = await requirePermission(patientId, "view_insights");
  const { t, locale } = await getT();
  const current = await now();
  const clock = { today: istDate(current), nowMinutes: istMinutes(current) };
  const data = await loadInsightInputs(patientId, clock, 30);

  const insights = [
    mealEffect(data.readings, data.meals),
    walkEffect(data.readings, data.checkins),
    medicineEffect(data.readings, data.weeks),
    fastingTrend(data.readings, clock.today),
  ].filter((i): i is Insight => i !== null);
  const needed = afterDinnerReadingsNeeded(data.readings, data.meals);
  const series = fastingSeries(data.readings, data.from, clock.today).map((p) => ({
    ...p,
    label: formatDay(p.date, locale),
  }));
  const hasFasting = series.some((p) => p.mgdl !== null);

  return (
    <div className="flex flex-col gap-5">
      <h1 className="text-2xl font-semibold">{t("insights.title")}</h1>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{t("insights.chartTitle")}</CardTitle>
          <CardDescription>{t("insights.chartSubtitle", { low: patient.glucoseLow, high: patient.glucoseHigh })}</CardDescription>
        </CardHeader>
        <CardContent>
          {hasFasting ? (
            <>
              <FastingChart
                data={series}
                low={patient.glucoseLow}
                high={patient.glucoseHigh}
                seriesLabel={t("insights.fastingMgdl")}
                bandLabel={t("insights.targetRange")}
              />
              <table className="sr-only">
                <caption>{t("insights.chartTitle")}</caption>
                <tbody>
                  {series
                    .filter((p) => p.mgdl !== null)
                    .map((p) => (
                      <tr key={p.date}>
                        <th scope="row">{p.label}</th>
                        <td>{p.mgdl} mg/dL</td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </>
          ) : (
            <p className="py-6 text-center text-muted-foreground">{t("insights.noFasting")}</p>
          )}
        </CardContent>
      </Card>

      <section aria-labelledby="cards-heading" className="flex flex-col gap-3">
        <h2 id="cards-heading" className="text-lg font-semibold">
          {t("insights.whatMatters")}
        </h2>
        {insights.map((insight) => (
          <InsightCard key={insight.kind} insight={insight} t={t} locale={locale} />
        ))}
        {needed > 0 && !insights.some((i) => i.kind === "meal") ? (
          <p className="flex items-start gap-3 rounded-xl border border-dashed p-4 text-base">
            <LightbulbIcon className="mt-0.5 size-5 shrink-0 text-chart-2" aria-hidden />
            {t("insights.needMore", { count: needed })}
          </p>
        ) : null}
      </section>
    </div>
  );
}
