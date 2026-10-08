import { redirect } from "next/navigation";
import { SparklesIcon } from "lucide-react";
import { AppShell } from "@/components/shell/app-shell";
import { OnboardingQuiz } from "@/components/pcos/onboarding-quiz";
import { requireUser } from "@/lib/auth";
import { getT } from "@/lib/i18n-server";
import { getPcosPatientSummary } from "@/lib/pcos-data";

export default async function PcosOnboardingPage({
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

  // Doctor's prescription MUST be filled first!
  if (!summary.prescription) {
    redirect(`/pcos/prescription?p=${summary.patient.id}`);
  }

  const patient = summary.patient;
  const rx = summary.prescription;

  return (
    <AppShell patient={patient}>
      <div className="flex flex-col gap-6 pt-2 pb-10">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-teal-600 mb-1">
            <SparklesIcon className="size-4" />
            Step 2 of 2 · Behavioral & Phenotype Fit
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Personalizing Your PCOS Plan
          </h1>
          <p className="mt-1 text-sm text-muted-foreground leading-relaxed">
            Synced with prescription from{" "}
            <span className="font-medium text-foreground">{rx.doctorName}</span>. Answer 9 quick
            questions to personalize your circadian, food sequencing, and low-cortisol protocols.
          </p>
        </div>

        <OnboardingQuiz patientId={patient.id} doctorName={rx.doctorName} />
      </div>
    </AppShell>
  );
}
