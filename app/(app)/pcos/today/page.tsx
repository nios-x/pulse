import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ActivityIcon,
  HeartPulseIcon,
  PillIcon,
  StethoscopeIcon,
  UtensilsIcon,
} from "lucide-react";
import { AppShell } from "@/components/shell/app-shell";
import { DailyProtocolList } from "@/components/pcos/daily-protocol-list";
import { GraceDayTrigger } from "@/components/pcos/grace-day-trigger";
import { PcosNav } from "@/components/pcos/pcos-nav";
import { Button } from "@/components/ui/button";
import { requireUser } from "@/lib/auth";
import { getT } from "@/lib/i18n-server";
import { getPcosPatientSummary, getPcosTodayData } from "@/lib/pcos-data";
import { getDailyProtocol } from "@/lib/pcos-protocols";

export default async function PcosTodayPage({
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

  // Doctor's prescription is required first!
  if (!summary.prescription) {
    redirect(`/pcos/prescription?p=${summary.patient.id}`);
  }

  // Onboarding profile must be completed next!
  if (!summary.profile) {
    redirect(`/pcos/onboarding?p=${summary.patient.id}`);
  }

  const patient = summary.patient;
  const rx = summary.prescription;
  const profile = summary.profile;

  // Extract prescribed medications and supplements
  const meds = (rx.medications as any) || [];
  const supps = (rx.supplements as any) || [];

  // Generate today's personalized daily action protocol
  const protocolActions = getDailyProtocol(profile.phenotype, meds, supps);

  // Load today's logs & actions
  const todayData = await getPcosTodayData(patient.id);
  const completedKeys = todayData.todayActions
    .filter((a) => a.completed)
    .map((a) => a.actionKey);

  const phenotypeLabels: Record<string, { title: string; subtitle: string; icon: string }> = {
    insulin_resistant: {
      title: "Insulin-Resistant PCOS",
      subtitle: "Focusing on glucose blunting & post-meal movement",
      icon: "🥗",
    },
    adrenal_stress: {
      title: "Adrenal / Stress PCOS",
      subtitle: "Focusing on cortisol down-regulation & nervous system recovery",
      icon: "🧘‍♀️",
    },
    inflammatory: {
      title: "Inflammatory PCOS",
      subtitle: "Focusing on gut repair, sleep & anti-inflammatory nourishment",
      icon: "🫐",
    },
    post_pill: {
      title: "Post-Pill PCOS",
      subtitle: "Focusing on pituitary-ovarian axis & liver clearance",
      icon: "🌱",
    },
  };

  const currentPhenotype =
    phenotypeLabels[profile.phenotype] || phenotypeLabels.insulin_resistant;

  return (
    <AppShell patient={patient}>
      <div className="flex flex-col gap-5 pt-1 pb-12">
        <PcosNav patientId={patient.id} />

        {/* Prescription & Phenotype Header Card */}
        <div className="rounded-2xl border border-teal-500/20 bg-linear-to-br from-teal-500/10 via-background to-teal-500/5 p-4.5 shadow-xs flex flex-col gap-3">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <span className="text-2xl">{currentPhenotype.icon}</span>
              <div>
                <h1 className="text-lg font-bold text-foreground">
                  {currentPhenotype.title}
                </h1>
                <p className="text-xs text-muted-foreground">{currentPhenotype.subtitle}</p>
              </div>
            </div>
            <Link
              href={`/pcos/prescription?p=${patient.id}`}
              className="rounded-lg bg-teal-100 dark:bg-teal-900/40 p-1.5 text-teal-700 dark:text-teal-300 hover:bg-teal-200"
              title="View Doctor's Prescription"
            >
              <StethoscopeIcon className="size-4" />
            </Link>
          </div>

          <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-teal-500/15 text-xs text-muted-foreground">
            <span className="flex items-center gap-1 font-medium text-foreground">
              <StethoscopeIcon className="size-3.5 text-teal-600" />
              {rx.doctorName}
            </span>
            <span>•</span>
            <span className="flex items-center gap-1">
              <PillIcon className="size-3 text-teal-600" />
              {meds.length} meds, {supps.length} supplements active
            </span>
          </div>
        </div>

        {/* Forgiveness Engine: Grace Day Card */}
        <GraceDayTrigger patientId={patient.id} todayGraceDay={todayData.todayGraceDay} />

        {/* Quick Log Buttons */}
        <div className="grid grid-cols-2 gap-3">
          <Link
            href={`/pcos/symptoms?p=${patient.id}`}
            className="flex items-center gap-2.5 p-3.5 rounded-2xl border border-border/70 bg-card hover:border-teal-500/40 shadow-xs transition-all"
          >
            <div className="flex size-9 items-center justify-center rounded-xl bg-teal-500/10 text-teal-600">
              <ActivityIcon className="size-4.5" />
            </div>
            <div className="min-w-0">
              <span className="text-xs font-bold block text-foreground truncate">
                Log Symptoms
              </span>
              <span className="text-[0.65rem] text-muted-foreground">30-sec check-in</span>
            </div>
          </Link>

          <Link
            href={`/pcos/food?p=${patient.id}`}
            className="flex items-center gap-2.5 p-3.5 rounded-2xl border border-border/70 bg-card hover:border-teal-500/40 shadow-xs transition-all"
          >
            <div className="flex size-9 items-center justify-center rounded-xl bg-teal-500/10 text-teal-600">
              <UtensilsIcon className="size-4.5" />
            </div>
            <div className="min-w-0">
              <span className="text-xs font-bold block text-foreground truncate">
                Food Pairing
              </span>
              <span className="text-[0.65rem] text-muted-foreground">Protein first hack</span>
            </div>
          </Link>
        </div>

        {/* Daily Protocol Checklist */}
        <DailyProtocolList
          patientId={patient.id}
          actions={protocolActions}
          completedKeys={completedKeys}
        />
      </div>
    </AppShell>
  );
}
