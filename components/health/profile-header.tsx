import Link from "next/link";
import { CalendarDaysIcon, FileHeartIcon, HeartPulseIcon, LayoutListIcon, PillIcon, SirenIcon, TriangleAlertIcon } from "lucide-react";
import { MemberAvatar } from "@/components/health/member-avatar";
import { buttonVariants } from "@/components/ui/button";
import { istDate } from "@/lib/dates";
import { listMyPatients } from "@/lib/patients";
import { getT } from "@/lib/i18n-server";
import type { MessageKey } from "@/lib/i18n";
import { demoProfile } from "@/lib/mock-data";
import { now } from "@/lib/now";
import { ageIn } from "@/lib/vitals";
import { cn } from "@/lib/utils";

export type ProfileTab = "overview" | "vitals" | "meds" | "records" | "doctor";

const TABS: { tab: ProfileTab; key: MessageKey; segment: string; icon: typeof PillIcon }[] = [
  { tab: "overview", key: "nav.overview", segment: "", icon: LayoutListIcon },
  { tab: "vitals", key: "nav.vitals", segment: "vitals", icon: HeartPulseIcon },
  { tab: "meds", key: "nav.meds", segment: "meds", icon: PillIcon },
  { tab: "records", key: "nav.records", segment: "records", icon: FileHeartIcon },
  { tab: "doctor", key: "nav.appointments", segment: "doctor", icon: CalendarDaysIcon },
];

/** Who this is, what a stranger must know first, and the five sections of their health. */
export async function ProfileHeader({
  patient,
  userId,
  active,
}: {
  patient: { id: string; name: string; birthYear: number | null; city: string | null; synthetic: boolean };
  userId: string;
  active: ProfileTab;
}) {
  const { t } = await getT();
  const today = istDate(await now());
  const demo = demoProfile(patient, today);
  const mine = await listMyPatients(userId);
  const index = Math.max(0, mine.findIndex((m) => m.id === patient.id));
  const age = ageIn(patient.birthYear, today);
  const severe = demo?.profile.allergies.filter((a) => a.severity === "severe") ?? [];

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center gap-4">
        <MemberAvatar name={patient.name} index={index} size="xl" className="max-sm:size-16 max-sm:text-xl" />
        <div className="flex min-w-[12rem] flex-1 flex-col gap-1">
          <h1 className="text-[2rem] leading-[1.1] font-bold tracking-[-0.02em] sm:text-4xl">{patient.name}</h1>
          <p className="text-base text-ink-2 sm:text-lg">
            {[age !== null ? t("profile.years", { age }) : null, patient.city, ...(demo?.profile.conditions.map((c) => c.name) ?? [])]
              .filter(Boolean)
              .join(" · ")}
          </p>
        </div>
        <div className="flex items-center gap-2 max-sm:w-full">
          {demo ? (
            <span className="sheet flex h-14 flex-col items-center justify-center rounded-xl px-3.5 leading-none">
              <span className="text-xs font-medium text-ink-3">{t("member.bloodGroup")}</span>
              <span className="mt-1 text-2xl font-bold tracking-tight">{demo.profile.bloodGroup}</span>
            </span>
          ) : null}
          <Link href={`/p/${patient.id}/emergency`} className={buttonVariants({ variant: "outline", size: "touch", className: "h-14 max-sm:flex-1" })}>
            <SirenIcon className="text-alert" aria-hidden />
            {t("profile.openEmergency")}
          </Link>
        </div>
      </div>

      {severe.length ? (
        <p className="flex flex-wrap items-center gap-x-2 gap-y-1 rounded-xl bg-alert-wash px-4 py-2.5 text-base text-alert-ink ring-1 ring-inset ring-alert/20">
          <TriangleAlertIcon className="size-5 shrink-0" aria-hidden />
          <span className="font-semibold">{t("profile.allergies")}:</span>
          {severe.map((a) => `${a.name} (${t("profile.severe").toLowerCase()})`).join(", ")}
        </p>
      ) : null}

      <nav aria-label={t("profile.sections")} className="no-scrollbar -mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
        <ul className="well flex w-max min-w-full gap-1 rounded-2xl p-1 sm:w-full">
          {TABS.map(({ tab, key, segment, icon: Icon }) => {
            const on = tab === active;
            return (
              <li key={tab} className="flex-1">
                <Link
                  href={segment ? `/p/${patient.id}/${segment}` : `/p/${patient.id}`}
                  aria-current={on ? "page" : undefined}
                  className={cn(
                    "flex h-11 items-center justify-center gap-2 rounded-xl px-4 text-[0.9375rem] font-semibold whitespace-nowrap transition-colors duration-150",
                    on ? "sheet text-ink" : "text-ink-2 hover:text-ink"
                  )}
                >
                  <Icon className={cn("size-[1.125rem]", on ? "text-sage" : "text-ink-3")} aria-hidden />
                  {t(key)}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
}
