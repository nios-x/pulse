import { redirect } from "next/navigation";
import { ActivityIcon, CalendarIcon } from "lucide-react";
import { AppShell } from "@/components/shell/app-shell";
import { PcosNav } from "@/components/pcos/pcos-nav";
import { SymptomLogger } from "@/components/pcos/symptom-logger";
import { requireUser } from "@/lib/auth";
import { getT } from "@/lib/i18n-server";
import { getPcosPatientSummary, getRecentSymptoms } from "@/lib/pcos-data";

export default async function PcosSymptomsPage({
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
  const recentLogs = await getRecentSymptoms(patient.id, 20);

  return (
    <AppShell patient={patient}>
      <div className="flex flex-col gap-5 pt-1 pb-12">
        <PcosNav patientId={patient.id} />

        <div>
          <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-teal-600 mb-0.5">
            <ActivityIcon className="size-3.5" />
            Biofeedback
          </div>
          <h1 className="text-xl font-bold tracking-tight text-foreground">
            Symptom Check-in & Trends
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
            Track hormonal symptoms daily. This data helps your doctor evaluate whether your current
            protocol is working.
          </p>
        </div>

        {/* 30-sec Logger */}
        <SymptomLogger patientId={patient.id} />

        {/* Recent logs history */}
        <div className="flex flex-col gap-3 pt-2">
          <h2 className="text-sm font-bold text-foreground">Recent Logged Readings</h2>
          {recentLogs.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border p-6 text-center text-xs text-muted-foreground">
              No symptoms logged yet. Check in above to begin mapping your patterns.
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {recentLogs.slice(0, 10).map((log) => (
                <div
                  key={log.id}
                  className="flex items-center justify-between p-3.5 rounded-xl border border-border/70 bg-card text-xs shadow-xs"
                >
                  <div className="flex flex-col gap-0.5">
                    <span className="font-semibold text-foreground capitalize">
                      {log.category.replace("_", " ")}
                    </span>
                    <span className="text-[0.65rem] text-muted-foreground">{log.date}</span>
                    {log.notes && <span className="text-[0.65rem] text-muted-foreground italic">&ldquo;{log.notes}&rdquo;</span>}
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex gap-0.5">
                      {[1, 2, 3, 4, 5].map((i) => (
                        <div
                          key={i}
                          className={`size-2 rounded-full ${
                            i <= log.severity ? "bg-teal-600" : "bg-muted"
                          }`}
                        />
                      ))}
                    </div>
                    <span className="font-bold text-foreground text-xs ml-1">{log.severity}/5</span>
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
