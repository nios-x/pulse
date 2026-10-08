"use client";

import { useTransition } from "react";
import { ackAlertAction } from "@/app/(app)/p/[patientId]/alerts/actions";
import { useT } from "@/components/i18n-provider";
import { Button } from "@/components/ui/button";

export function AckButton({ patientId, alertId }: { patientId: string; alertId: string }) {
  const t = useT();
  const [pending, startTransition] = useTransition();
  return (
    <Button
      size="touch"
      variant="outline"
      disabled={pending}
      onClick={() => startTransition(async () => void (await ackAlertAction({ patientId, alertId })))}
    >
      {t("alerts.ack")}
    </Button>
  );
}
