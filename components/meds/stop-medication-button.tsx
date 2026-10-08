"use client";

import { useTransition } from "react";
import { stopMedicationAction } from "@/app/(app)/p/[patientId]/meds/actions";
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

export function StopMedicationButton({
  patientId,
  medicationId,
  name,
}: {
  patientId: string;
  medicationId: string;
  name: string;
}) {
  const t = useT();
  const [pending, startTransition] = useTransition();
  return (
    <Dialog>
      <DialogTrigger render={<Button variant="destructive" size="touch" className="w-full" />}>
        {t("meds.stop")}
      </DialogTrigger>
      <DialogContent closeLabel={t("common.close")}>
        <DialogTitle className="text-lg">{t("meds.stopTitle", { name })}</DialogTitle>
        <DialogDescription className="text-base">{t("meds.stopBody")}</DialogDescription>
        <DialogFooter>
          <DialogClose render={<Button variant="outline" size="touch" />}>{t("common.cancel")}</DialogClose>
          <Button
            variant="destructive"
            size="touch"
            disabled={pending}
            onClick={() => startTransition(async () => void (await stopMedicationAction({ patientId, medicationId })))}
          >
            {t("meds.stop")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
