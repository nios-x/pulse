"use client";

import { useOptimistic, useTransition } from "react";
import { CheckIcon, MoonIcon, SunIcon, SunriseIcon, type LucideIcon } from "lucide-react";
import { markDoseAction } from "@/app/(app)/p/[patientId]/meds/actions";
import { useT } from "@/components/i18n-provider";
import { MemberAvatar } from "@/components/health/member-avatar";
import { RoleGate } from "@/components/health/role-gate";
import { toast } from "@/components/ui/toast";
import type { DoseStatus } from "@/lib/adherence";
import type { Daypart } from "@/lib/family";
import { cn } from "@/lib/utils";

export type DoseItemData = {
  patientId: string;
  medicationId: string;
  name: string;
  dose: string;
  slot: string;
  slotLabel: string;
  daypart: Daypart;
  status: DoseStatus;
  late: boolean;
  canMark: boolean;
  /** Shown on the family checklist, where doses from several people mix. */
  who?: { name: string; index: number };
};

const DAYPARTS: { key: Daypart; icon: LucideIcon }[] = [
  { key: "morning", icon: SunriseIcon },
  { key: "afternoon", icon: SunIcon },
  { key: "night", icon: MoonIcon },
];

const id = (d: { medicationId: string; slot: string }) => `${d.medicationId}|${d.slot}`;

/** Today's doses grouped by morning, afternoon and night. One tap ticks a dose. */
export function DoseChecklist({
  items,
  lockedReason,
  emptyText,
}: {
  items: DoseItemData[];
  lockedReason: string;
  emptyText: string;
}) {
  const t = useT();
  const [, start] = useTransition();
  const [list, setTaken] = useOptimistic(items, (state, change: { key: string; taken: boolean }) =>
    state.map((d) => (id(d) === change.key ? { ...d, status: change.taken ? "taken" : "due", late: false } : d))
  );

  const mark = (d: DoseItemData, taken: boolean) =>
    start(async () => {
      setTaken({ key: id(d), taken });
      const res = await markDoseAction({ patientId: d.patientId, medicationId: d.medicationId, slot: d.slot, taken });
      if (res.ok) {
        toast.add({
          type: "success",
          title: taken ? t("dose.toastTaken", { name: d.name }) : t("dose.toastUndone", { name: d.name }),
          description: d.who ? `${d.who.name.split(" ")[0]} · ${d.slotLabel}` : d.slotLabel,
        });
      } else {
        toast.add({ type: "error", title: t("common.error") });
      }
    });

  if (list.length === 0) {
    return <p className="rounded-2xl border-2 border-dashed border-edge-strong bg-card/50 border-edge-strong px-4 py-6 text-center text-ink-2">{emptyText}</p>;
  }

  return (
    <div className="flex flex-col gap-5">
      {DAYPARTS.map(({ key, icon: Icon }) => {
        const group = list.filter((d) => d.daypart === key);
        if (group.length === 0) return null;
        const done = group.filter((d) => d.status === "taken").length;
        return (
          <section key={key} aria-label={t(`daypart.${key}`)} className="flex flex-col gap-2">
            <div className="flex items-center gap-2 text-[0.9375rem] font-semibold text-ink-2">
              <Icon className="size-[1.125rem] text-sage" aria-hidden />
              {t(`daypart.${key}`)}
              <span className="ml-auto font-normal text-ink-3 tabular">{t("dose.countDone", { done, total: group.length })}</span>
            </div>
            <ul className="flex flex-col gap-2">
              {group.map((d) => (
                <DoseRow key={id(d)} d={d} onMark={mark} lockedReason={lockedReason} />
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
}

function DoseRow({
  d,
  onMark,
  lockedReason,
}: {
  d: DoseItemData;
  onMark: (d: DoseItemData, taken: boolean) => void;
  lockedReason: string;
}) {
  const t = useT();
  const taken = d.status === "taken";
  const state = taken ? "taken" : d.late ? "late" : d.status === "due" ? "due" : "later";

  return (
    <li
      className={cn(
        "flex items-center gap-3 rounded-xl px-3 py-2.5 transition-colors duration-200",
        taken ? "bg-ok-wash/60" : state === "late" ? "bg-alert-wash/70" : "well"
      )}
    >
      <RoleGate allowed={d.canMark} reason={lockedReason}>
        <button
          type="button"
          onClick={() => onMark(d, !taken)}
          aria-pressed={taken}
          aria-label={taken ? t("meds.undoTaken", { name: d.name }) : t("dose.markAria", { name: d.name, time: d.slotLabel })}
          className={cn(
            "flex size-11 shrink-0 items-center justify-center rounded-full transition-[background-color,box-shadow,transform] duration-200 active:scale-95",
            taken ? "check-done" : "border-2 border-dashed border-sage/50 bg-sheet text-sage hover:border-sage hover:bg-sage-wash"
          )}
        >
          <CheckIcon className={cn("size-5", !taken && "opacity-0 [button:hover>&]:opacity-60")} strokeWidth={3} aria-hidden />
        </button>
      </RoleGate>
      <div className="min-w-0 flex-1">
        <p className={cn("truncate text-base font-semibold", taken && "text-ink-2")}>
          {d.name} <span className="font-normal text-ink-3">{d.dose}</span>
        </p>
        <p className="flex items-center gap-1.5 text-sm text-ink-2">
          {d.who ? (
            <>
              <MemberAvatar name={d.who.name} index={d.who.index} size="sm" className="size-5 text-[0.55rem]" />
              <span className="truncate">{d.who.name.split(" ")[0]}</span>
              <span aria-hidden>·</span>
            </>
          ) : null}
          <span className="tabular">{d.slotLabel}</span>
        </p>
      </div>
      <span
        className={cn(
          "shrink-0 text-sm font-semibold",
          state === "taken" && "text-ok-ink",
          state === "late" && "text-alert-ink",
          state === "due" && "text-watch-ink",
          state === "later" && "font-medium text-ink-3"
        )}
      >
        {t(`dose.state.${state}`)}
      </span>
    </li>
  );
}
