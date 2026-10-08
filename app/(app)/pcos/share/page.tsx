import Link from "next/link";
import { redirect } from "next/navigation";
import {
  CalendarIcon,
  CheckCircle2Icon,
  FileTextIcon,
  PillIcon,
  Share2Icon,
  SparklesIcon,
  StethoscopeIcon,
} from "lucide-react";
import { AppShell } from "@/components/shell/app-shell";
import { PcosNav } from "@/components/pcos/pcos-nav";
import { Button } from "@/components/ui/button";
import { requireUser } from "@/lib/auth";
import { getT } from "@/lib/i18n-server";
import { getPcosPatientSummary } from "@/lib/pcos-data";

export default async function PcosSharePage({
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
  const rx = summary.prescription;
  const profile = summary.profile;

  const meds = (rx.medications as any) || [];
  const supps = (rx.supplements as any) || [];

  return (
    <AppShell patient={patient}>
      <div className="flex flex-col gap-5 pt-1 pb-12">
        <PcosNav patientId={patient.id} />

        <div>
          <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-teal-600 mb-0.5">
            <StethoscopeIcon className="size-3.5" />
            Clinical Record
          </div>
          <h1 className="text-xl font-bold tracking-tight text-foreground">
            Doctor&apos;s Prescription & Care Plan
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
            Your medical anchor. Everything in your daily protocol maps back to these physician
            instructions.
          </p>
        </div>

        {/* Doctor Card */}
        <div className="rounded-2xl border border-teal-500/25 bg-linear-to-br from-teal-50/70 via-background to-teal-50/30 dark:from-teal-950/30 dark:to-background p-5 shadow-xs flex flex-col gap-4">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2">
                <StethoscopeIcon className="size-5 text-teal-600" />
                <h2 className="text-base font-bold text-foreground">{rx.doctorName}</h2>
              </div>
              {rx.clinicName && (
                <p className="text-xs text-muted-foreground mt-0.5">{rx.clinicName}</p>
              )}
            </div>

            <Link
              href={`/pcos/prescription?p=${patient.id}`}
              className="text-xs font-semibold text-teal-700 hover:text-teal-800 underline"
            >
              Edit Rx
            </Link>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs pt-1 border-t border-border/40">
            <div>
              <span className="text-muted-foreground block text-[0.68rem]">Prescription Date</span>
              <span className="font-semibold text-foreground">{rx.prescriptionDate}</span>
            </div>
            <div>
              <span className="text-muted-foreground block text-[0.68rem]">Diagnosis</span>
              <span className="font-semibold text-foreground capitalize">{rx.diagnosis}</span>
            </div>
          </div>
        </div>

        {/* Prescribed Medications */}
        <div className="rounded-2xl border border-border/70 bg-card p-4.5 flex flex-col gap-3 shadow-xs">
          <div className="flex items-center gap-2">
            <PillIcon className="size-4.5 text-teal-600" />
            <h3 className="text-sm font-bold text-foreground">Prescribed Medications</h3>
          </div>

          {meds.length === 0 ? (
            <p className="text-xs text-muted-foreground">No prescription medications listed.</p>
          ) : (
            <div className="flex flex-col gap-2">
              {meds.map((m: any, idx: number) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-3 rounded-xl border border-teal-500/20 bg-teal-50/40 dark:bg-teal-950/20 text-xs"
                >
                  <div>
                    <span className="font-bold text-foreground block">{m.name}</span>
                    <span className="text-[0.68rem] text-muted-foreground">{m.frequency}</span>
                  </div>
                  <span className="rounded-md bg-teal-100 dark:bg-teal-900/60 px-2 py-0.5 text-xs font-bold text-teal-800 dark:text-teal-200">
                    {m.dose}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Doctor-Recommended Supplements */}
        <div className="rounded-2xl border border-border/70 bg-card p-4.5 flex flex-col gap-3 shadow-xs">
          <div className="flex items-center gap-2">
            <SparklesIcon className="size-4.5 text-teal-600" />
            <h3 className="text-sm font-bold text-foreground">Recommended Supplements</h3>
          </div>

          {supps.length === 0 ? (
            <p className="text-xs text-muted-foreground">No supplements listed.</p>
          ) : (
            <div className="flex flex-col gap-2">
              {supps.map((s: any, idx: number) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-3 rounded-xl border border-border/60 bg-muted/40 text-xs"
                >
                  <div>
                    <span className="font-bold text-foreground block">{s.name}</span>
                    <span className="text-[0.68rem] text-muted-foreground">{s.frequency}</span>
                  </div>
                  <span className="text-xs font-semibold text-muted-foreground">{s.dose}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Doctor's Advice */}
        {(rx.dietaryAdvice || rx.exerciseAdvice) && (
          <div className="rounded-2xl border border-border/70 bg-card p-4.5 flex flex-col gap-3 shadow-xs">
            <h3 className="text-sm font-bold text-foreground">Doctor's Lifestyle Guidance</h3>

            {rx.dietaryAdvice && (
              <div className="text-xs">
                <span className="font-semibold text-foreground block mb-0.5">Dietary Guidance:</span>
                <p className="text-muted-foreground leading-relaxed">{rx.dietaryAdvice}</p>
              </div>
            )}

            {rx.exerciseAdvice && (
              <div className="text-xs pt-1 border-t border-border/40">
                <span className="font-semibold text-foreground block mb-0.5">Movement Guidance:</span>
                <p className="text-muted-foreground leading-relaxed">{rx.exerciseAdvice}</p>
              </div>
            )}
          </div>
        )}

        {/* Doctor Consultation Share Box */}
        <div className="rounded-2xl border border-teal-500/30 bg-teal-50/60 dark:bg-teal-950/30 p-5 flex flex-col gap-3 shadow-xs">
          <div className="flex items-center gap-2">
            <Share2Icon className="size-5 text-teal-600" />
            <h3 className="text-sm font-bold text-teal-950 dark:text-teal-100">
              Prepare for Next Doctor Visit
            </h3>
          </div>
          <p className="text-xs text-teal-800 dark:text-teal-200 leading-relaxed">
            Your doctor needs clear, objective data: symptom frequency, food sequencing adherence,
            and cycle intervals. Pulse formats your logs into a 30-second clinician summary.
          </p>

          <div className="pt-1">
            <Button
              type="button"
              className="w-full bg-teal-600 hover:bg-teal-700 text-white font-semibold rounded-xl text-sm h-11"
            >
              <FileTextIcon className="size-4 mr-2" /> View Doctor Printable Summary
            </Button>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
