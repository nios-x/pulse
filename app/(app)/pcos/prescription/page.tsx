import { redirect } from "next/navigation";
import { StethoscopeIcon } from "lucide-react";
import { AppShell } from "@/components/shell/app-shell";
import { PrescriptionForm } from "@/components/pcos/prescription-form";
import { requireUser } from "@/lib/auth";
import { getT } from "@/lib/i18n-server";
import { getPcosPatientSummary } from "@/lib/pcos-data";

export default async function PcosPrescriptionPage({
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

  const patient = summary.patient;

  return (
    <AppShell patient={patient}>
      <div className="flex flex-col gap-6 pt-2 pb-10">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-teal-600 mb-1">
            <StethoscopeIcon className="size-4" />
            Step 1 of 2 · Clinical Protocol
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Doctor&apos;s Prescription
          </h1>
          <p className="mt-1 text-sm text-muted-foreground leading-relaxed">
            Record what your doctor prescribed. Your daily medication reminders and lifestyle
            targets will be synced directly from this prescription.
          </p>
        </div>

        <PrescriptionForm patientId={patient.id} />
      </div>
    </AppShell>
  );
}
