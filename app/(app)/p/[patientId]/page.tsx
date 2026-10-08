import Link from "next/link";
import { CalendarDaysIcon, ChevronRightIcon, DropletIcon, FileTextIcon, HeartPulseIcon, PencilLineIcon, ScaleIcon } from "lucide-react";
import { DoseChecklist } from "@/components/health/dose-item";
import { ProfileHeader } from "@/components/health/profile-header";
import { LockedPanel } from "@/components/health/role-gate";
import { SafetyNote } from "@/components/health/safety-note";
import { SectionHeading } from "@/components/health/page-header";
import { StatusBadge } from "@/components/health/status-badge";
import { buttonVariants } from "@/components/ui/button";
import { daypartOf, loadFamily, upcomingFor } from "@/lib/family";
import { formatDay, formatSlot, formatTime } from "@/lib/format";
import { getT } from "@/lib/i18n-server";
import { canLog } from "@/lib/permissions";
import { requireView } from "@/lib/view-as";
import { cn } from "@/lib/utils";

function Tile({
  icon: Icon,
  label,
  value,
  unit,
  badge,
  foot,
}: {
  icon: typeof DropletIcon;
  label: string;
  value: string;
  unit: string;
  badge?: React.ReactNode;
  foot: string;
}) {
  return (
    <div className="well flex flex-col gap-3 rounded-xl p-4">
      <p className="flex items-center gap-2 text-[0.9375rem] font-medium text-ink-2">
        <Icon className="size-[1.125rem] text-ink-3" aria-hidden />
        {label}
      </p>
      <p className="flex items-baseline gap-1.5">
        <span className="figure text-[2.5rem] font-semibold">{value}</span>
        <span className="text-base text-ink-3">{unit}</span>
      </p>
      <div className="flex flex-wrap items-center gap-2">
        {badge}
        <span className="text-sm text-ink-3">{foot}</span>
      </div>
    </div>
  );
}

export default async function MemberOverview({ params }: PageProps<"/p/[patientId]">) {
  const { patientId } = await params;
  const { user, patient, can, appRole } = await requireView(patientId, "view_summary");
  const { t, locale } = await getT();
  const { members, today, current } = await loadFamily();
  const m = members.find((x) => x.id === patientId);

  if (!m) {
    return (
      <div className="flex flex-col gap-6">
        <ProfileHeader patient={patient} userId={user.id} active="overview" />
        <LockedPanel title={t(`approle.${appRole}`)} reason={t("gate.view_health")} />
      </div>
    );
  }

  const demo = m.demo;
  const weights = demo?.vitals.filter((v) => v.kind === "weight") ?? [];
  const weight = weights.at(-1);
  const firstWeight = weights[0];
  const [next] = await upcomingFor([m], today, current, 60);
  const latestRecord = demo?.records[0];

  return (
    <div className="flex flex-col gap-8">
      <ProfileHeader patient={patient} userId={user.id} active="overview" />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="flex min-w-0 flex-col gap-6">
          {can.view_vitals ? (
            <section aria-labelledby="latest-heading" className="sheet rounded-2xl p-5">
              <SectionHeading
                id="latest-heading"
                aside={
                  <Link href={`/p/${patientId}/vitals`} className="flex min-h-11 items-center gap-1 text-[0.9375rem] font-semibold text-sage-deep hover:underline">
                    {t("profile.seeAll")}
                    <ChevronRightIcon className="size-4" aria-hidden />
                  </Link>
                }
              >
                {t("profile.latest")}
              </SectionHeading>
              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                {m.sugar ? (
                  <Tile
                    icon={DropletIcon}
                    label={t("member.sugar")}
                    value={String(m.sugar.mgdl)}
                    unit="mg/dL"
                    badge={<StatusBadge tone={m.sugar.status.tone} size="sm">{t(`vital.${m.sugar.status.label}`)}</StatusBadge>}
                    foot={`${t(`context.${m.sugar.context}`)}, ${formatTime(m.sugar.at, locale)}`}
                  />
                ) : null}
                {m.bp ? (
                  <Tile
                    icon={HeartPulseIcon}
                    label={t("vitals.bp")}
                    value={`${m.bp.systolic}/${m.bp.diastolic}`}
                    unit="mmHg"
                    badge={<StatusBadge tone={m.bp.status.tone} size="sm">{t(`vital.${m.bp.status.label}`)}</StatusBadge>}
                    foot={formatDay(m.bp.on, locale)}
                  />
                ) : null}
                {weight?.kind === "weight" ? (
                  <Tile
                    icon={ScaleIcon}
                    label={t("profile.weight")}
                    value={String(weight.kg)}
                    unit="kg"
                    foot={
                      firstWeight?.kind === "weight" && firstWeight !== weight
                        ? t("vitals.change", {
                            delta: `${weight.kg - firstWeight.kg > 0 ? "+" : ""}${(weight.kg - firstWeight.kg).toFixed(1)}`,
                            date: formatDay(firstWeight.measuredOn, locale),
                          })
                        : formatDay(weight.measuredOn, locale)
                    }
                  />
                ) : null}
                {!m.sugar && !m.bp && !weight ? (
                  <p className="text-base text-ink-2 sm:col-span-3">{t("vitals.noDataBody")}</p>
                ) : null}
              </div>
              <SafetyNote className="mt-4">{t("safety.notDiagnosis")}</SafetyNote>
            </section>
          ) : (
            <LockedPanel title={t("profile.latest")} reason={t("gate.view_vitals")} />
          )}

          <section aria-labelledby="meds-heading" className="sheet rounded-2xl p-5">
            <SectionHeading
              id="meds-heading"
              aside={
                <Link href={`/p/${patientId}/meds`} className="flex min-h-11 items-center gap-1 text-[0.9375rem] font-semibold text-sage-deep hover:underline">
                  {t("meds.allMeds")}
                  <ChevronRightIcon className="size-4" aria-hidden />
                </Link>
              }
            >
              {t("profile.todayMeds")}
            </SectionHeading>
            <div className="mt-4">
              <DoseChecklist
                items={m.doses.map((d) => ({ ...d, slotLabel: formatSlot(d.slot, locale), daypart: daypartOf(d.slot), canMark: can.mark_dose }))}
                emptyText={t("member.noMeds")}
                lockedReason={t("gate.mark_doses")}
              />
            </div>
          </section>
        </div>

        <aside className="flex min-w-0 flex-col gap-6">
          {canLog(can) ? (
            <Link href={`/p/${patientId}/log`} className={buttonVariants({ size: "xl", className: "w-full" })}>
              <PencilLineIcon aria-hidden />
              {t("home.logFor", { name: m.firstName })}
            </Link>
          ) : null}

          <section aria-labelledby="health-heading" className="sheet rounded-2xl p-5">
            {demo ? (
              <dl className="flex flex-col gap-4">
                <div>
                  <dt className="text-[0.9375rem] font-medium text-ink-2">{t("profile.allergies")}</dt>
                  <dd className="mt-1.5 flex flex-col gap-1.5">
                    {demo.profile.allergies.length ? (
                      demo.profile.allergies.map((a) => (
                        <span key={a.name} className="flex flex-wrap items-center gap-2">
                          <StatusBadge tone={a.severity === "severe" ? "alert" : "watch"} size="sm">
                            {t(a.severity === "severe" ? "profile.severe" : "profile.mild")}
                          </StatusBadge>
                          <span className="text-base font-semibold">{a.name}</span>
                          <span className="w-full text-sm text-ink-3">{a.reaction}</span>
                        </span>
                      ))
                    ) : (
                      <span className="text-base">{t("profile.noAllergies")}</span>
                    )}
                  </dd>
                </div>
                <div>
                  <dt id="health-heading" className="text-[0.9375rem] font-medium text-ink-2">{t("profile.conditions")}</dt>
                  <dd className="mt-1.5 flex flex-wrap gap-1.5">
                    {demo.profile.conditions.length ? (
                      demo.profile.conditions.map((c) => (
                        <span key={c.name} className="rounded-lg bg-well px-2.5 py-1 text-[0.9375rem]">
                          {c.name}
                          {c.since ? <span className="text-ink-3"> · {t("profile.since", { year: c.since })}</span> : null}
                        </span>
                      ))
                    ) : (
                      <span className="text-base">{t("profile.noConditions")}</span>
                    )}
                  </dd>
                </div>
              </dl>
            ) : (
              <p id="health-heading" className="text-base text-ink-2">{t("profile.noDemo")}</p>
            )}
          </section>

          <section className="sheet rounded-2xl p-5">
            <p className="flex items-center gap-2 text-[0.9375rem] font-medium text-ink-2">
              <CalendarDaysIcon className="size-[1.125rem] text-ink-3" aria-hidden />
              {t("profile.next")}
            </p>
            {next ? (
              <Link href={`/p/${patientId}/doctor`} className="mt-2 block rounded-xl hover:bg-well/50">
                <p className="text-lg font-semibold">{next.kind === "video" && !next.title ? t("appt.videoCall") : next.title}</p>
                <p className="text-base text-ink-2">
                  {formatDay(next.on, locale, true)}, {formatSlot(next.time, locale)}
                </p>
                <p className="text-sm text-ink-3">{[next.who, next.place].filter((x, i, a) => x && a.indexOf(x) === i).join(", ")}</p>
              </Link>
            ) : (
              <p className="mt-2 text-base">{t("profile.noNext")}</p>
            )}
          </section>

          {latestRecord ? (
            <Link href={`/p/${patientId}/records`} className={cn("sheet flex items-center gap-3 rounded-2xl p-5 transition-colors hover:bg-well/40")}>
              <span className="well flex size-11 shrink-0 items-center justify-center rounded-xl">
                <FileTextIcon className="size-5 text-sage" aria-hidden />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm text-ink-3">{t("profile.lastRecord")}</span>
                <span className="block truncate text-base font-semibold">{latestRecord.title}</span>
                <span className="block truncate text-sm text-ink-2">{latestRecord.summary}</span>
              </span>
              <ChevronRightIcon className="size-5 text-ink-3" aria-hidden />
            </Link>
          ) : null}
        </aside>
      </div>
    </div>
  );
}
