"use client";

import { useState, useTransition, type ReactNode } from "react";
import { CheckIcon, Trash2Icon } from "lucide-react";
import { deleteMedicationsAction } from "@/app/(app)/p/[patientId]/meds/actions";
import { useT } from "@/components/i18n-provider";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

type Med = { id: string; name: string };

/** Confirms, then deletes the given medicines for good (history too). */
export function DeleteMedicationsButton({
  patientId,
  meds,
  trigger,
  onDeleted,
}: {
  patientId: string;
  meds: Med[];
  trigger: ReactNode;
  onDeleted?: () => void;
}) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const one = meds.length === 1;
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={<Button variant="destructive" size="touch" className="w-full" disabled={meds.length === 0} />}
      >
        {trigger}
      </DialogTrigger>
      <DialogContent closeLabel={t("common.close")}>
        <DialogTitle className="text-lg">
          {one ? t("meds.deleteTitle", { name: meds[0].name }) : t("meds.deleteTitleMany", { count: meds.length })}
        </DialogTitle>
        <DialogDescription className="text-base">{t(one ? "meds.deleteBody" : "meds.deleteBodyMany")}</DialogDescription>
        {!one ? <p className="text-base font-medium text-plum">{meds.map((m) => m.name).join(", ")}</p> : null}
        <DialogFooter>
          <DialogClose render={<Button variant="outline" size="touch" />}>{t("common.cancel")}</DialogClose>
          <Button
            variant="destructive"
            size="touch"
            disabled={pending}
            onClick={() =>
              startTransition(async () => {
                const result = await deleteMedicationsAction({ patientId, medicationIds: meds.map((m) => m.id) });
                if (result.ok) {
                  setOpen(false);
                  onDeleted?.();
                }
              })
            }
          >
            <Trash2Icon aria-hidden />
            {pending ? t("common.wait") : t("meds.delete")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/**
 * The week cards, plus a Select mode for people who manage medicines:
 * tick several cards, then delete them together.
 */
export function MedicationList({
  patientId,
  heading,
  canManage,
  items,
}: {
  patientId: string;
  heading: ReactNode;
  canManage: boolean;
  items: { id: string; name: string; card: ReactNode }[];
}) {
  const t = useT();
  const [selecting, setSelecting] = useState(false);
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const chosen = items.filter((m) => picked.has(m.id));
  const stop = () => {
    setSelecting(false);
    setPicked(new Set());
  };
  const toggle = (id: string) =>
    setPicked((p) => {
      const next = new Set(p);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  return (
    <>
      <div className="flex items-center justify-between gap-3">
        {heading}
        {canManage ? (
          <Button variant="ghost" size="touch" className="text-violet-deep" onClick={() => (selecting ? stop() : setSelecting(true))}>
            {selecting ? t("common.cancel") : t("meds.select")}
          </Button>
        ) : null}
      </div>
      {selecting ? (
        <div className="flex items-center justify-between gap-3">
          <p className="text-base text-ink-2">{t("meds.selectHint")}</p>
          <button
            type="button"
            className="action-link h-11 shrink-0"
            onClick={() => setPicked(chosen.length === items.length ? new Set() : new Set(items.map((m) => m.id)))}
          >
            {t("meds.selectAll")}
          </button>
        </div>
      ) : null}
      {items.map((m) => {
        const on = picked.has(m.id);
        return (
          <div key={m.id} className={cn("relative rounded-2xl", selecting && on && "ring-3 ring-violet")}>
            {m.card}
            {selecting ? (
              // Covers the card while picking, so a tap anywhere ticks it (and never opens Edit).
              <label className="absolute inset-0 flex cursor-pointer justify-end rounded-2xl p-3">
                <input type="checkbox" checked={on} onChange={() => toggle(m.id)} className="peer sr-only" />
                <span className="sr-only">{m.name}</span>
                <span
                  className={cn(
                    "flex size-7 items-center justify-center rounded-lg border-2 bg-card text-white transition-colors peer-focus-visible:ring-4 peer-focus-visible:ring-violet/20",
                    on ? "border-violet bg-violet" : "border-edge-strong"
                  )}
                >
                  <CheckIcon className={cn("size-4 stroke-3", !on && "opacity-0")} aria-hidden />
                </span>
              </label>
            ) : null}
          </div>
        );
      })}
      {selecting ? (
        <div className="sticky bottom-[calc(5.5rem+env(safe-area-inset-bottom))] z-20 rounded-2xl bg-card p-2 shadow-lift">
          <DeleteMedicationsButton
            patientId={patientId}
            meds={chosen}
            onDeleted={stop}
            trigger={
              <>
                <Trash2Icon aria-hidden />
                {t("meds.deleteSelected", { count: chosen.length })}
              </>
            }
          />
        </div>
      ) : null}
    </>
  );
}
