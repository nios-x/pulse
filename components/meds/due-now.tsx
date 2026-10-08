"use client";

import { useOptimistic, useTransition } from "react";
import { CheckIcon, PillIcon } from "lucide-react";
import { markDoseAction } from "@/app/(app)/p/[patientId]/meds/actions";
import { useT } from "@/components/i18n-provider";
import { Button } from "@/components/ui/button";
import { BlobBadge } from "@/components/shapes/shapes";
import { cn } from "@/lib/utils";

export type DueItem = {
  medicationId: string;
  name: string;
  dose: string;
  slot: string;
  slotLabel: string;
  taken: boolean;
  /** False for a dose later today: shown calmly, still tickable. */
  due?: boolean;
};

/** "Due now" cards with one big Taken button each. */
export function DueNow({ patientId, items }: { patientId: string; items: DueItem[] }) {
  const t = useT();
  const [, startTransition] = useTransition();
  const [optimistic, setOptimistic] = useOptimistic(
    items,
    (state, change: { medicationId: string; slot: string; taken: boolean }) =>
      state.map((i) =>
        i.medicationId === change.medicationId && i.slot === change.slot ? { ...i, taken: change.taken } : i
      )
  );

  const mark = (item: DueItem, taken: boolean) =>
    startTransition(async () => {
      setOptimistic({ medicationId: item.medicationId, slot: item.slot, taken });
      await markDoseAction({ patientId, medicationId: item.medicationId, slot: item.slot, taken });
    });

  return (
    <ul className="flex flex-col gap-3">
      {optimistic.map((item) => (
        <li
          key={`${item.medicationId}-${item.slot}`}
          className={cn(
            "flex items-center gap-3.5 rounded-2xl p-3 pr-3.5 transition-[background-color,box-shadow] duration-300",
            item.taken
              ? "bg-mint-wash/70"
              : item.due === false
                ? "sheet"
                : "sheet ring-2 ring-watch/60"
          )}
        >
          <BlobBadge seed={item.slot.length + item.name.length} tone={item.taken ? "white" : "violet"} className={cn("size-14", item.taken && "text-go")}>
            <PillIcon aria-hidden />
          </BlobBadge>
          <div className="min-w-0 flex-1">
            <p className="truncate font-heading text-base font-semibold text-plum">{item.name}</p>
            <p className="text-sm text-ink-2">
              {[item.dose, t("meds.doseAt", { time: item.slotLabel })].filter(Boolean).join(" · ")}
            </p>
          </div>
          {item.taken ? (
            <button
              type="button"
              onClick={() => mark(item, false)}
              className="flex h-14 min-w-24 flex-col items-center justify-center rounded-xl px-2 text-go"
              aria-label={t("meds.undoTaken", { name: item.name })}
            >
              <span className="flex items-center gap-1 font-heading text-base font-semibold">
                <CheckIcon className="size-5" aria-hidden />
                {t("meds.taken")}
              </span>
              <span className="text-xs text-ink-3 underline">{t("meds.undo")}</span>
            </button>
          ) : (
            <Button size="xl" className="min-w-24 px-4" onClick={() => mark(item, true)}>
              {t("meds.markTaken")}
            </Button>
          )}
        </li>
      ))}
    </ul>
  );
}
