import Link from "next/link";
import {
  ActivityIcon,
  ArrowRightIcon,
  HeartPulseIcon,
  PillIcon,
  ShieldCheckIcon,
  SparklesIcon,
  StethoscopeIcon,
  UtensilsIcon,
} from "lucide-react";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { memberships, patients } from "@/db/schema";
import { LanguageSwitch } from "@/components/shell/language-switch";
import { SignOutButton } from "@/components/shell/sign-out-button";
import { requireUser } from "@/lib/auth";
import { getT } from "@/lib/i18n-server";

export default async function SelectConditionPage() {
  const user = await requireUser();
  const { t } = await getT();

  // Find existing patient profiles for this user
  const userPatients = await db
    .select({
      id: patients.id,
      name: patients.name,
      condition: patients.condition,
    })
    .from(memberships)
    .innerJoin(patients, eq(memberships.patientId, patients.id))
    .where(eq(memberships.userId, user.id));

  const diabetesPatient = userPatients.find((p) => p.condition === "type2_diabetes");
  const pcosPatient = userPatients.find((p) => p.condition === "pcos");

  const diabetesHref = diabetesPatient ? `/home?p=${diabetesPatient.id}` : "/home";
  const pcosHref = pcosPatient ? `/pcos?p=${pcosPatient.id}` : "/pcos";

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-between px-4 py-6">
      {/* Top Header */}
      <div>
        <header className="flex items-center justify-between pb-6 border-b border-border/40">
          <div className="flex items-center gap-2.5">
            <span className="flex size-10 items-center justify-center rounded-xl bg-primary text-primary-foreground">
              <HeartPulseIcon className="size-6" />
            </span>
            <div>
              <span className="text-base font-bold text-foreground leading-none block">
                {t("app.name")}
              </span>
              <span className="text-xs text-muted-foreground">{t("app.tagline")}</span>
            </div>
          </div>
          <SignOutButton />
        </header>

        {/* Hero Section */}
        <div className="pt-6 pb-5">
          <span className="text-xs font-semibold text-primary uppercase tracking-wider block mb-1">
            Hello, {user.name} 👋
          </span>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            {t("choose.title")}
          </h1>
          <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
            {t("choose.subtitle")}
          </p>
        </div>

        {/* Condition 1: Type 2 Diabetes */}
        <div className="flex flex-col gap-4">
          <Link
            href={diabetesHref}
            className="group relative flex flex-col gap-3.5 p-5 rounded-2xl border-2 border-border/70 bg-card hover:border-primary/80 hover:bg-muted/30 transition-all shadow-xs"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-3">
                <div className="flex size-11 items-center justify-center rounded-xl bg-teal-500/10 text-teal-600 dark:bg-teal-950/40 dark:text-teal-400">
                  <ActivityIcon className="size-6" />
                </div>
                <div>
                  <span className="text-[0.68rem] font-bold uppercase tracking-wider text-teal-700 dark:text-teal-300 block">
                    {t("choose.diabetes.badge")}
                  </span>
                  <h2 className="text-lg font-bold text-foreground group-hover:text-primary transition-colors">
                    {t("choose.diabetes.title")}
                  </h2>
                </div>
              </div>
              <span className="text-xl">🩸</span>
            </div>

            <p className="text-xs text-muted-foreground leading-relaxed">
              {t("choose.diabetes.desc")}
            </p>

            <div className="grid grid-cols-2 gap-1.5 pt-1 text-[0.68rem] text-muted-foreground font-medium">
              <span className="flex items-center gap-1.5 truncate">
                <span className="size-1.5 rounded-full bg-teal-500" /> Fasting & Post-Meal Sugar
              </span>
              <span className="flex items-center gap-1.5 truncate">
                <span className="size-1.5 rounded-full bg-teal-500" /> 7-Day Meds Grid
              </span>
              <span className="flex items-center gap-1.5 truncate">
                <span className="size-1.5 rounded-full bg-teal-500" /> Carb Photo / Meal Log
              </span>
              <span className="flex items-center gap-1.5 truncate">
                <span className="size-1.5 rounded-full bg-teal-500" /> 90-Day Doctor Link
              </span>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-border/40 text-xs font-semibold text-primary">
              <span>{t("choose.diabetes.btn")}</span>
              <ArrowRightIcon className="size-4 group-hover:translate-x-1 transition-transform" />
            </div>
          </Link>

          {/* Condition 2: PCOS Companion */}
          <Link
            href={pcosHref}
            className="group relative flex flex-col gap-3.5 p-5 rounded-2xl border-2 border-teal-500/40 bg-linear-to-br from-teal-50/50 via-background to-teal-50/20 dark:from-teal-950/25 dark:to-background hover:border-teal-600 transition-all shadow-xs"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-3">
                <div className="flex size-11 items-center justify-center rounded-xl bg-teal-600 text-white shadow-xs">
                  <SparklesIcon className="size-6" />
                </div>
                <div>
                  <span className="text-[0.68rem] font-bold uppercase tracking-wider text-teal-700 dark:text-teal-300 block">
                    {t("choose.pcos.badge")}
                  </span>
                  <h2 className="text-lg font-bold text-foreground group-hover:text-teal-700 dark:group-hover:text-teal-300 transition-colors">
                    {t("choose.pcos.title")}
                  </h2>
                </div>
              </div>
              <span className="text-xl">🌸</span>
            </div>

            <p className="text-xs text-muted-foreground leading-relaxed">
              {t("choose.pcos.desc")}
            </p>

            <div className="grid grid-cols-2 gap-1.5 pt-1 text-[0.68rem] text-muted-foreground font-medium">
              <span className="flex items-center gap-1.5 truncate">
                <span className="size-1.5 rounded-full bg-teal-600" /> Doctor&apos;s Prescription First
              </span>
              <span className="flex items-center gap-1.5 truncate">
                <span className="size-1.5 rounded-full bg-teal-600" /> 4 Phenotype Protocols
              </span>
              <span className="flex items-center gap-1.5 truncate">
                <span className="size-1.5 rounded-full bg-teal-600" /> Protein-First Food Sequencing
              </span>
              <span className="flex items-center gap-1.5 truncate">
                <span className="size-1.5 rounded-full bg-teal-600" /> Grace Days & Forgiveness
              </span>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-teal-500/20 text-xs font-semibold text-teal-700 dark:text-teal-300">
              <span>{t("choose.pcos.btn")}</span>
              <ArrowRightIcon className="size-4 group-hover:translate-x-1 transition-transform" />
            </div>
          </Link>
        </div>

        {/* Helpful note */}
        <p className="text-center text-xs text-muted-foreground mt-4 px-2">
          💡 {t("choose.switchNote")}
        </p>
      </div>

      {/* Language Switcher at footer */}
      <footer className="pt-6">
        <LanguageSwitch />
      </footer>
    </div>
  );
}
