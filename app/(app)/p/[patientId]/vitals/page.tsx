import Link from "next/link";
import { and, asc, eq, gte } from "drizzle-orm";
import { DropletIcon, HeartPulseIcon, PencilLineIcon, ScaleIcon } from "lucide-react";
import { db } from "@/db";
import { glucoseReadings } from "@/db/schema";
import { EmptyState } from "@/components/health/empty-state";
import { ProfileHeader } from "@/components/health/profile-header";
import { LockedPanel, RoleGate } from "@/components/health/role-gate";
import { SafetyNote } from "@/components/health/safety-note";
import { StatusBadge } from "@/components/health/status-badge";
import { VitalChart, type VitalPoint } from "@/components/health/vital-chart";
import { buttonVariants } from "@/components/ui/button";
import { addDays, istDate, istDateTime } from "@/lib/dates";
import { formatDay } from "@/lib/format";
import { getT } from "@/lib/i18n-server";
import { fastingSeries } from "@/lib/insights";
import { demoProfile } from "@/lib/mock-data";
import { now } from "@/lib/now";
import { requireView } from "@/lib/view-as";
import { BP_BAND, GLUCOSE_TARGET, bpStatus, glucoseStatus } from "@/lib/vitals";

const DAYS = 30;

function Panel({
  id,
  icon: Icon,
  title,
  latest,
  children,
}: {
  id: string;
  icon: typeof DropletIcon;
  title: string;
  latest?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section aria-labelledby={id} className="sheet settle flex flex-col gap-4 rounded-2xl p-5 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <h2 id={id} className="flex items-center gap-2 text-xl font-semibold tracking-[-0.02em]">
          <Icon className="size-5 text-sage" aria-hidden />
          {title}
        </h2>
        {latest}
      </div>
      {children}
    </section>
  );
}

export default async function VitalsPage({ params }: PageProps<"/p/[patientId]/vitals">) {
  const { patientId } = await params;
  const { user, patient, can } = await requireView(patientId, "view_summary");
  const { t, locale } = await getT();
  const today = istDate(await now());
  const header = <ProfileHeader patient={patient} userId={user.id} active="vitals" />;

  if (!can.view_vitals) {
    return (
      <div className="flex flex-col gap-8">
        {header}
        <LockedPanel title={t("nav.vitals")} reason={t("gate.view_vitals")} />
      </div>
    );
  }

  const from = addDays(today, -(DAYS - 1));
  const readings = await db
    .select({ mgdl: glucoseReadings.mgdl, context: glucoseReadings.context, measuredAt: glucoseReadings.measuredAt })
    .from(glucoseReadings)
    .where(and(eq(glucoseReadings.patientId, patientId), gte(glucoseReadings.measuredAt, istDateTime(from))))
    .orderBy(asc(glucoseReadings.measuredAt));
  const sugar: VitalPoint[] = fastingSeries(readings, from, today).map((p) => ({ date: p.date, label: formatDay(p.date, locale), mgdl: p.mgdl }));
  const lastFasting = [...readings].reverse().find((r) => r.context === "fasting");

  const demo = demoProfile(patient, today);
  const bp = (demo?.vitals ?? []).flatMap((v) => (v.kind === "bp" ? [v] : []));
  const weight = (demo?.vitals ?? []).flatMap((v) => (v.kind === "weight" ? [v] : []));
  const lastBp = bp.at(-1);
  const lastWeight = weight.at(-1);
  const [fastLow, fastHigh] = GLUCOSE_TARGET.fasting;

  const logAction = (
    <RoleGate allowed={can.log_glucose} reason={t("gate.log_readings")}>
      <Link href={`/p/${patientId}/log`} className={buttonVariants({ size: "xl" })}>
        <PencilLineIcon aria-hidden />
        {t("vitals.addReading")}
      </Link>
    </RoleGate>
  );

  return (
    <div className="flex flex-col gap-8">
      {header}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <p className="max-w-2xl text-lg text-ink-2">{t("vitals.subtitle", { name: patient.name.split(" ")[0] })}</p>
        {logAction}
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <Panel
          id="sugar-heading"
          icon={DropletIcon}
          title={t("vitals.sugar")}
          latest={
            lastFasting ? (
              <span className="flex items-center gap-2">
                <span className="figure text-3xl font-semibold">{lastFasting.mgdl}</span>
                <span className="text-sm text-ink-3">mg/dL</span>
                <StatusBadge tone={glucoseStatus(lastFasting.mgdl, "fasting", patient).tone}>
                  {t(`vital.${glucoseStatus(lastFasting.mgdl, "fasting", patient).label}`)}
                </StatusBadge>
              </span>
            ) : null
          }
        >
          {sugar.some((p) => p.mgdl !== null) ? (
            <>
              <VitalChart
                data={sugar}
                series={[{ key: "mgdl", label: t("vitals.sugar"), color: "var(--sage)" }]}
                bands={[{ from: fastLow, to: fastHigh, label: t("vitals.sugarBand", { low: fastLow, high: fastHigh }) }]}
                unit="mg/dL"
                caption={t("vitals.sugar")}
              />
              <p className="text-sm text-ink-3">{t("vitals.range", { days: DAYS })}</p>
            </>
          ) : (
            <EmptyState icon={DropletIcon} title={t("vitals.noData")} body={t("vitals.noDataBody")} className="py-8" />
          )}
        </Panel>

        <Panel
          id="bp-heading"
          icon={HeartPulseIcon}
          title={t("vitals.bp")}
          latest={
            lastBp ? (
              <span className="flex items-center gap-2">
                <span className="figure text-3xl font-semibold">
                  {lastBp.systolic}/{lastBp.diastolic}
                </span>
                <span className="text-sm text-ink-3">mmHg</span>
                <StatusBadge tone={bpStatus(lastBp.systolic, lastBp.diastolic).tone}>
                  {t(`vital.${bpStatus(lastBp.systolic, lastBp.diastolic).label}`)}
                </StatusBadge>
              </span>
            ) : null
          }
        >
          {bp.length ? (
            <>
              <VitalChart
                data={bp.map((v) => ({ date: v.measuredOn, label: formatDay(v.measuredOn, locale), systolic: v.systolic, diastolic: v.diastolic }))}
                series={[
                  { key: "systolic", label: t("vitals.systolic"), color: "var(--sage)" },
                  { key: "diastolic", label: t("vitals.diastolic"), color: "var(--chart-2)", dashed: true },
                ]}
                bands={[
                  { from: BP_BAND.systolic[0], to: BP_BAND.systolic[1], label: t("vitals.normalBand") },
                  { from: BP_BAND.diastolic[0], to: BP_BAND.diastolic[1] },
                ]}
                unit="mmHg"
                caption={t("vitals.bp")}
                domain={[50, 170]}
              />
              <p className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-ink-2">
                <span className="flex items-center gap-1.5">
                  <span aria-hidden className="h-0.5 w-5 rounded bg-sage" /> {t("vitals.systolic")}
                </span>
                <span className="flex items-center gap-1.5">
                  <span aria-hidden className="h-0.5 w-5 rounded border-t-2 border-dashed border-chart-2" /> {t("vitals.diastolic")}
                </span>
              </p>
            </>
          ) : (
            <EmptyState icon={HeartPulseIcon} title={t("vitals.noData")} body={t("vitals.noDataBody")} className="py-8" />
          )}
        </Panel>

        <Panel
          id="weight-heading"
          icon={ScaleIcon}
          title={t("vitals.weight")}
          latest={
            lastWeight ? (
              <span className="flex items-baseline gap-1.5">
                <span className="figure text-3xl font-semibold">{lastWeight.kg}</span>
                <span className="text-sm text-ink-3">kg</span>
              </span>
            ) : null
          }
        >
          {weight.length > 1 ? (
            <VitalChart
              data={weight.map((v) => ({ date: v.measuredOn, label: formatDay(v.measuredOn, locale), kg: v.kg }))}
              series={[{ key: "kg", label: t("vitals.weight"), color: "var(--sage)" }]}
              unit="kg"
              caption={t("vitals.weight")}
            />
          ) : (
            <EmptyState icon={ScaleIcon} title={t("vitals.noData")} body={t("vitals.noDataBody")} className="py-8" />
          )}
        </Panel>
      </div>

      <div className="flex flex-col gap-1">
        <SafetyNote>{t("safety.notDiagnosis")}</SafetyNote>
        {demo ? <SafetyNote>{t("vitals.demoNote")}</SafetyNote> : null}
      </div>
    </div>
  );
}
