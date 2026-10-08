import Link from "next/link";
import { ChevronRightIcon, DropletIcon, HeartPulseIcon, PillIcon } from "lucide-react";
import { MemberAvatar } from "@/components/health/member-avatar";
import { StatusBadge } from "@/components/health/status-badge";
import type { FamilyMember } from "@/lib/family";
import type { Translate } from "@/lib/i18n";
import { cn } from "@/lib/utils";

function Row({ icon: Icon, label, value, badge }: { icon: typeof PillIcon; label: string; value: React.ReactNode; badge?: React.ReactNode }) {
  return (
    <div className="flex min-h-11 items-center gap-3">
      <Icon className="size-[1.125rem] shrink-0 text-ink-3" aria-hidden />
      <span className="w-24 shrink-0 text-[0.9375rem] text-ink-2">{label}</span>
      <span className="min-w-0 flex-1 truncate text-base font-semibold tabular">{value}</span>
      {badge}
    </div>
  );
}

/** One person on the family desk: who they are, and how today looks. */
export function MemberCard({ member: m, t, style }: { member: FamilyMember; t: Translate; style?: React.CSSProperties }) {
  const p = m.demo?.profile;
  const taken = m.doses.filter((d) => d.status === "taken").length;
  const late = m.doses.some((d) => d.late);
  const tones = [m.sugar?.status.tone, m.bp?.status.tone, late ? "alert" : undefined];
  const needsLook = tones.includes("alert");

  return (
    <Link
      href={`/p/${m.id}`}
      style={style}
      className="settle sheet group flex flex-col gap-4 rounded-2xl p-5 transition-[transform,box-shadow] duration-200 hover:-translate-y-0.5 hover:shadow-[inset_0_1px_0_oklch(1_0_0/0.9),0_24px_40px_-24px_oklch(0.35_0.05_150/0.45)]"
    >
      <div className="flex items-start gap-3.5">
        <MemberAvatar name={m.name} index={m.index} size="lg" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-xl font-semibold tracking-[-0.02em]">{m.name}</p>
          <p className="text-[0.9375rem] text-ink-2">
            {[m.age !== null ? t("member.age", { age: m.age }) : null, m.city].filter(Boolean).join(" · ")}
          </p>
          <p className="mt-0.5 text-sm text-ink-3">{t("member.yourRole", { role: t(`approle.${m.appRole}`) })}</p>
        </div>
        {p ? (
          <span className="flex flex-col items-center rounded-xl border border-edge bg-sheet px-2.5 py-1.5 leading-none" title={t("member.bloodGroup")}>
            <span className="text-[0.6875rem] font-medium text-ink-3">{t("member.bloodShort")}</span>
            <span className="mt-1 text-xl font-bold tracking-tight">{p.bloodGroup}</span>
          </span>
        ) : null}
      </div>

      <div className="flex flex-col divide-y divide-edge/70">
        {m.can.view_vitals ? (
          <>
            {m.sugar ? (
              <Row
                icon={DropletIcon}
                label={t("member.sugar")}
                value={`${m.sugar.mgdl} mg/dL`}
                badge={<StatusBadge tone={m.sugar.status.tone} size="sm">{t(`vital.${m.sugar.status.label}`)}</StatusBadge>}
              />
            ) : null}
            {m.bp ? (
              <Row
                icon={HeartPulseIcon}
                label={t("member.bp")}
                value={`${m.bp.systolic}/${m.bp.diastolic}`}
                badge={<StatusBadge tone={m.bp.status.tone} size="sm">{t(`vital.${m.bp.status.label}`)}</StatusBadge>}
              />
            ) : null}
            {!m.sugar && !m.bp ? <Row icon={HeartPulseIcon} label={t("member.vitals")} value={<span className="font-normal text-ink-3">{t("member.noReadings")}</span>} /> : null}
          </>
        ) : null}
        <Row
          icon={PillIcon}
          label={t("member.today")}
          value={
            m.doses.length ? (
              t("member.dosesTaken", { taken, total: m.doses.length })
            ) : (
              <span className="font-normal text-ink-3">{t("member.noMeds")}</span>
            )
          }
          badge={late ? <StatusBadge tone="alert" size="sm">{t("dose.state.late")}</StatusBadge> : null}
        />
      </div>

      <div className="mt-auto flex items-center gap-2">
        <div className="flex min-w-0 flex-1 flex-wrap gap-1.5">
          {(p?.conditions ?? []).slice(0, 2).map((c) => (
            <span key={c.name} className="rounded-lg bg-well px-2 py-0.5 text-sm text-ink-2">
              {c.name}
            </span>
          ))}
          {p && p.conditions.length === 0 ? <span className="text-sm text-ink-3">{t("member.noConditions")}</span> : null}
        </div>
        <span
          className={cn(
            "flex items-center gap-0.5 text-[0.9375rem] font-semibold text-sage-deep",
            needsLook && "text-alert-ink"
          )}
        >
          {needsLook ? t("member.needsLook") : t("member.open")}
          <ChevronRightIcon className="size-4 transition-transform duration-150 group-hover:translate-x-0.5" aria-hidden />
        </span>
      </div>
    </Link>
  );
}
