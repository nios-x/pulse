"use client";

import { useOptimistic, useTransition } from "react";
import { CheckIcon, PillIcon } from "lucide-react";
import { markDoseAction } from "@/app/(app)/p/[patientId]/meds/actions";
import { useT } from "@/components/i18n-provider";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type DueItem = {
  medicationId: string;
  name: string;
  dose: string;
  slot: string;
  slotLabel: string;
  taken: boolean;
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
    <ul className="flex flex-col gap-2">
      {optimistic.map((item) => (
        <li
          key={`${item.medicationId}-${item.slot}`}
          className={cn(
            "flex items-center gap-3 rounded-xl border p-3 transition-colors",
            item.taken ? "border-success/40 bg-success/10" : "border-warning bg-warning/15"
          )}
        >
          <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-card">
            <PillIcon className="size-5 text-primary" aria-hidden />
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-base font-semibold">
              {item.name} <span className="font-normal text-muted-foreground">{item.dose}</span>
            </p>
            <p className="text-sm text-muted-foreground">{t("meds.doseAt", { time: item.slotLabel })}</p>
          </div>
          {item.taken ? (
            <button
              type="button"
              onClick={() => mark(item, false)}
              className="flex h-14 min-w-24 flex-col items-center justify-center rounded-xl px-2 text-success"
              aria-label={t("meds.undoTaken", { name: item.name })}
            >
              <span className="flex items-center gap-1 text-base font-semibold">
                <CheckIcon className="size-5" aria-hidden />
                {t("meds.taken")}
              </span>
              <span className="text-xs text-muted-foreground underline">{t("meds.undo")}</span>
            </button>
          ) : (
            <Button size="xl" className="min-w-24" onClick={() => mark(item, true)}>
              {t("meds.markTaken")}
            </Button>
          )}
        </li>
      ))}
    </ul>
  );
}
