import Link from "next/link";
import { redirect } from "next/navigation";
import { HeartPulseIcon, SparklesIcon, StethoscopeIcon } from "lucide-react";
import { createPcosPatientAction } from "@/app/actions/pcos";
import { AppShell } from "@/components/shell/app-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { requireUser } from "@/lib/auth";
import { getT } from "@/lib/i18n-server";
import { getPcosPatientSummary } from "@/lib/pcos-data";

export default async function PcosLandingPage({
  searchParams,
}: {
  searchParams: Promise<{ p?: string }>;
}) {
  const user = await requireUser();
  const { t } = await getT();
  const params = await searchParams;

  const summary = await getPcosPatientSummary(user.id, params.p);

  // If the user already has a PCOS profile with prescription & profile setup, go to today's plan
  if (summary) {
    const patientId = summary.patient.id;
    if (!summary.prescription) {
      redirect(`/pcos/prescription?p=${patientId}`);
    }
    if (!summary.profile) {
      redirect(`/pcos/onboarding?p=${patientId}`);
    }
    redirect(`/pcos/today?p=${patientId}`);
  }

  // If no PCOS patient exists yet, show the warm onboarding intro to create their PCOS space
  return (
    <AppShell patient={null}>
      <div className="flex flex-col gap-6 pt-2 pb-8">
        <div className="flex items-center gap-3">
          <div className="flex size-12 items-center justify-center rounded-2xl bg-teal-500/10 text-teal-600">
            <HeartPulseIcon className="size-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              Pulse PCOS Companion
            </h1>
            <p className="text-sm text-muted-foreground">
              Hormonal, metabolic & lifestyle care designed for Gen-Z
            </p>
          </div>
        </div>

        {/* Clinical Anchor Notice */}
        <div className="flex items-start gap-3 rounded-2xl border border-teal-500/20 bg-teal-50/70 p-4 dark:bg-teal-950/20">
          <StethoscopeIcon className="size-5 shrink-0 text-teal-600 mt-0.5" />
          <div className="text-sm leading-relaxed text-teal-950 dark:text-teal-200">
            <strong className="font-semibold block mb-0.5">Doctor's Guidance First</strong>
            PCOS is a complex endocrine condition. Pulse builds your daily rhythm around your
            physician&apos;s diagnosis, medications, and clinical recommendations.
          </div>
        </div>

        <Card className="border-border/60 shadow-sm">
          <CardContent className="flex flex-col gap-5 pt-6">
            <div className="space-y-2">
              <h2 className="text-lg font-semibold text-foreground">
                Set up your personalized PCOS space
              </h2>
              <p className="text-sm text-muted-foreground">
                We'll start by recording your doctor's prescription, then classify your unique PCOS
                phenotype.
              </p>
            </div>

            <form action={createPcosPatientAction} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-foreground">Your Name</label>
                <input
                  name="name"
                  defaultValue={user.name}
                  required
                  className="h-12 w-full rounded-xl border border-input bg-background px-4 text-base focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
                  placeholder="Enter your name"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-medium text-foreground">Birth Year</label>
                  <input
                    name="birthYear"
                    type="number"
                    min="1980"
                    max="2012"
                    defaultValue="2003"
                    className="h-12 w-full rounded-xl border border-input bg-background px-4 text-base focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
                    placeholder="e.g. 2003"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-medium text-foreground">City</label>
                  <input
                    name="city"
                    className="h-12 w-full rounded-xl border border-input bg-background px-4 text-base focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
                    placeholder="e.g. New Delhi"
                  />
                </div>
              </div>

              <div className="pt-2">
                <Button
                  type="submit"
                  size="xl"
                  className="w-full bg-teal-600 hover:bg-teal-700 text-white font-semibold rounded-xl text-base shadow-sm"
                >
                  <SparklesIcon className="size-5 mr-2" />
                  Proceed to Doctor's Prescription
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Feature pillars */}
        <div className="grid grid-cols-2 gap-3 pt-2">
          <div className="rounded-xl border border-border/50 bg-card p-3.5">
            <span className="text-xl">🥗</span>
            <h3 className="mt-2 text-sm font-semibold">Food Pairing, Not Guilt</h3>
            <p className="mt-0.5 text-xs text-muted-foreground leading-relaxed">
              No calorie counting or strict diets. We focus on protein-first meal sequencing.
            </p>
          </div>
          <div className="rounded-xl border border-border/50 bg-card p-3.5">
            <span className="text-xl">✨</span>
            <h3 className="mt-2 text-sm font-semibold">Forgiveness Engine</h3>
            <p className="mt-0.5 text-xs text-muted-foreground leading-relaxed">
              Finch-style Grace Days protect your consistency on flare-up and cramp days.
            </p>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
