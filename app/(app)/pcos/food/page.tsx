import { redirect } from "next/navigation";
import { UtensilsIcon } from "lucide-react";
import { AppShell } from "@/components/shell/app-shell";
import { FoodPairingForm } from "@/components/pcos/food-pairing-form";
import { PcosNav } from "@/components/pcos/pcos-nav";
import { requireUser } from "@/lib/auth";
import { getT } from "@/lib/i18n-server";
import { getPcosPatientSummary, getRecentPcosFoods } from "@/lib/pcos-data";

export default async function PcosFoodPage({
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
  const recentLogs = await getRecentPcosFoods(patient.id, 10);

  return (
    <AppShell patient={patient}>
      <div className="flex flex-col gap-5 pt-1 pb-12">
        <PcosNav patientId={patient.id} />

        <div>
          <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-teal-600 mb-0.5">
            <UtensilsIcon className="size-3.5" />
            Addition-First Nutrition
          </div>
          <h1 className="text-xl font-bold tracking-tight text-foreground">
            Food Pairing & Hacks
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
            Zero calorie counting. We focus on food sequencing (protein before carbs) and post-meal
            movement to keep insulin and androgen spikes low.
          </p>
        </div>

        <FoodPairingForm patientId={patient.id} />

        {/* Recent Food Pairing Logs */}
        <div className="flex flex-col gap-3 pt-2">
          <h2 className="text-sm font-bold text-foreground">Recent Meal Habits</h2>
          {recentLogs.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border p-6 text-center text-xs text-muted-foreground">
              No meal pairings logged yet. Record your lunch or dinner above!
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {recentLogs.map((log) => (
                <div
                  key={log.id}
                  className="flex flex-col gap-1.5 p-3.5 rounded-xl border border-border/70 bg-card text-xs shadow-xs"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-foreground capitalize">{log.slot}</span>
                    <span className="text-[0.65rem] text-muted-foreground">{log.date}</span>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {log.items.map((it) => (
                      <span
                        key={it}
                        className="rounded-md bg-muted px-2 py-0.5 text-[0.65rem] font-medium text-foreground capitalize"
                      >
                        {it.replace("_", " ")}
                      </span>
                    ))}
                  </div>
                  {log.preMealAction && (
                    <span className="text-[0.65rem] font-medium text-teal-700 dark:text-teal-300">
                      Strategy: {log.preMealAction.replace("_", " ")}
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}
