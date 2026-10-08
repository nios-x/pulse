import { CheckIcon, PencilIcon, XIcon } from "lucide-react";
import { DoseGrid } from "@/components/meds/dose-grid";
import { DueNowSection } from "@/components/meds/due-now-section";
import { MedicationForm } from "@/components/meds/medication-form";
import { StopMedicationButton } from "@/components/meds/stop-medication-button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { adherence, doseGrid } from "@/lib/adherence";
import { addDays, dateRange, istDate, istMinutes } from "@/lib/dates";
import { formatSlot } from "@/lib/format";
import { getT } from "@/lib/i18n-server";
import { loadMeds } from "@/lib/meds";
import { now } from "@/lib/now";
import { requirePermission } from "@/lib/permissions";
import { Leaf, WaveField } from "@/components/shapes/shapes";

export default async function MedsPage({ params }: PageProps<"/p/[patientId]/meds">) {
  const { patientId } = await params;
  const { permissions, patient } = await requirePermission(patientId, "view_summary");
  const { t, locale } = await getT();

  const current = await now();
  const clock = { today: istDate(current), nowMinutes: istMinutes(current) };
  const days = dateRange(addDays(clock.today, -6), clock.today);
  const { meds, logs } = await loadMeds(patientId, days[0]);
  const week = adherence(meds, logs, days[0], clock.today, clock);
  const timeLabels = Object.fromEntries(
    ["08:00", "14:00", "20:00"].map((s) => [s, formatSlot(s, locale)])
  );

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-[2rem] leading-tight">{t("page.meds")}</h1>

      {permissions.view_meds && week.percent !== null ? (
        <div className="relative flex items-center gap-4 overflow-hidden rounded-2xl bg-violet px-5 py-5 text-white shadow-violet">
          <WaveField seed={33} edge={false} />
          <Leaf seed={34} veins={false} className="absolute -right-6 -bottom-8 w-28 text-mint/80" />
          <p className="figure relative text-5xl text-white">{week.percent}%</p>
          <p className="relative max-w-[18ch] text-base leading-snug text-white/95">
            {t("meds.adherence", { taken: week.taken, total: week.taken + week.missed })}
          </p>
        </div>
      ) : null}

      {permissions.mark_dose ? (
        <DueNowSection patientId={patientId} meds={meds} logs={logs} clock={clock} showEmpty={meds.length > 0} allDay />
      ) : null}

      {permissions.view_meds && meds.length ? (
        <section aria-labelledby="week-heading" className="flex flex-col gap-3">
          <h2 id="week-heading" className="text-xl font-semibold">
            {t("meds.lastWeek")}
          </h2>
          {meds.map((med) => (
            <Card key={med.id} size="sm">
              <CardHeader>
                <CardTitle className="text-base">
                  {med.name} <span className="font-normal text-ink-3">{med.dose}</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-3">
                <DoseGrid rows={doseGrid(med, logs, days, clock)} days={days} />
                {permissions.manage_meds ? (
                  <details className="group rounded-xl bg-violet-wash/60">
                    <summary className="action-link flex h-11 cursor-pointer list-none items-center gap-2 px-3">
                      <PencilIcon className="size-4" aria-hidden />
                      {t("meds.edit")}
                    </summary>
                    <div className="flex flex-col gap-3 border-t border-edge p-3">
                      <MedicationForm
                        patientId={patientId}
                        medication={{ id: med.id, name: med.name, dose: med.dose, times: med.times }}
                        timeLabels={timeLabels}
                      />
                      <StopMedicationButton patientId={patientId} medicationId={med.id} name={med.name} />
                    </div>
                  </details>
                ) : null}
              </CardContent>
            </Card>
          ))}
          <p className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <span className="flex size-4 items-center justify-center rounded-full bg-go text-white">
                <CheckIcon className="size-3" aria-hidden />
              </span>
              {t("meds.status.taken")}
            </span>
            <span className="flex items-center gap-1.5">
              <span className="flex size-4 items-center justify-center rounded-full bg-alert-wash text-alert-ink">
                <XIcon className="size-3" aria-hidden />
              </span>
              {t("meds.status.missed")}
            </span>
            <span className="flex items-center gap-1.5">
              <span className="size-4 rounded-full border-2 border-dashed border-edge-strong" aria-hidden />
              {t("meds.status.upcoming")}
            </span>
          </p>
        </section>
      ) : null}

      {meds.length === 0 ? (
        <p className="rounded-2xl border-2 border-dashed border-edge-strong bg-card/50 px-4 py-6 text-center text-muted-foreground">
          {permissions.manage_meds ? t("meds.emptyManage", { name: patient.name }) : t("meds.empty")}
        </p>
      ) : null}

      {permissions.manage_meds ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">{t("meds.addTitle")}</CardTitle>
          </CardHeader>
          <CardContent>
            <MedicationForm patientId={patientId} timeLabels={timeLabels} />
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
