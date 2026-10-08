import { redirect } from "next/navigation";
import { HeartPulseIcon, CalendarIcon, PlusIcon } from "lucide-react";
import { saveCycleLogAction } from "@/app/actions/pcos";
import { AppShell } from "@/components/shell/app-shell";
import { PcosNav } from "@/components/pcos/pcos-nav";
import { Button } from "@/components/ui/button";
import { requireUser } from "@/lib/auth";
import { getT } from "@/lib/i18n-server";
import { getPcosPatientSummary, getRecentCycles } from "@/lib/pcos-data";

export default async function PcosCyclePage({
  searchParams,
}: {
  searchParams: Promise<{ p?: string }>;
}) {
  const user = await requireUser();
  const { t } = await getT();
  const params = await searchParams;

  const summary = await getPcosPatientSummary(user.id, params.p);
  if (!summary) {
    redirect("/pcos");
  }

  // Doctor's prescription first!
  if (!summary.prescription) {
    redirect(`/pcos/prescription?p=${summary.patient.id}`);
  }

  const patient = summary.patient;
  const recentCycles = await getRecentCycles(patient.id, 10);

  return (
    <AppShell patient={patient}>
      <div className="flex flex-col gap-5 pt-1 pb-12">
        <PcosNav patientId={patient.id} />

        <div>
          <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-teal-600 mb-0.5">
            <HeartPulseIcon className="size-3.5" />
            Hormonal Rhythms
          </div>
          <h1 className="text-xl font-bold tracking-tight text-foreground">
            Cycle Tracking Without Pressure
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
            No 28-day assumptions or late-period panic alarms. We track your natural timeline and
            share cycle length trends with your doctor.
          </p>
        </div>

        {/* Log Period Form */}
        <div className="rounded-2xl border border-border/70 bg-card p-4.5 flex flex-col gap-4 shadow-xs">
          <h2 className="text-sm font-bold text-foreground">Log Menstrual Bleed</h2>

          <form action={saveCycleLogAction} className="flex flex-col gap-3.5">
            <input type="hidden" name="patientId" value={patient.id} />

            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-foreground">Start Date</label>
                <input
                  type="date"
                  name="startDate"
                  required
                  defaultValue={new Date().toISOString().split("T")[0]}
                  className="h-10 w-full rounded-xl border border-input bg-background px-3 text-xs focus:border-teal-500 focus:outline-none"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-foreground">End Date (Optional)</label>
                <input
                  type="date"
                  name="endDate"
                  className="h-10 w-full rounded-xl border border-input bg-background px-3 text-xs focus:border-teal-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-foreground">Flow Intensity</label>
              <select
                name="flowIntensity"
                className="h-10 w-full rounded-xl border border-input bg-background px-3 text-xs focus:border-teal-500 focus:outline-none"
              >
                <option value="1">1 - Spotting / Very Light</option>
                <option value="2">2 - Light Flow</option>
                <option value="3">3 - Moderate Regular Flow</option>
                <option value="4">4 - Heavy Flow</option>
                <option value="5">5 - Very Heavy Flow (Clotting)</option>
              </select>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-foreground">Notes / Symptoms</label>
              <input
                name="notes"
                placeholder="e.g. Mild cramps, fatigue"
                className="h-10 w-full rounded-xl border border-input bg-background px-3 text-xs focus:border-teal-500 focus:outline-none"
              />
            </div>

            <Button
              type="submit"
              size="lg"
              className="w-full bg-teal-600 hover:bg-teal-700 text-white font-semibold rounded-xl text-sm h-11 mt-1"
            >
              <PlusIcon className="size-4 mr-1.5" /> Save Cycle Entry
            </Button>
          </form>
        </div>

        {/* Cycle History Timeline */}
        <div className="flex flex-col gap-3 pt-2">
          <h2 className="text-sm font-bold text-foreground">Recorded Cycle History</h2>

          {recentCycles.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border p-6 text-center text-xs text-muted-foreground">
              No cycles recorded yet. Log your last period start date above.
            </div>
          ) : (
            <div className="flex flex-col gap-2.5">
              {recentCycles.map((c, idx) => (
                <div
                  key={c.id}
                  className="flex items-center justify-between p-4 rounded-xl border border-border/70 bg-card text-xs shadow-xs"
                >
                  <div className="flex flex-col gap-0.5">
                    <span className="font-bold text-foreground">
                      Started: {c.startDate}
                    </span>
                    {c.endDate && (
                      <span className="text-[0.68rem] text-muted-foreground">
                        Ended: {c.endDate}
                      </span>
                    )}
                    {c.notes && (
                      <span className="text-[0.65rem] text-muted-foreground italic">
                        &ldquo;{c.notes}&rdquo;
                      </span>
                    )}
                  </div>
                  <div className="text-right">
                    <span className="rounded-md bg-teal-100 dark:bg-teal-900/40 px-2 py-1 text-[0.68rem] font-bold text-teal-800 dark:text-teal-200">
                      Flow: {c.flowIntensity || 3}/5
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}
