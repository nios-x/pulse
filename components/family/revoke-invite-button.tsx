"use client";

import { useTransition } from "react";
import { revokeInviteAction } from "@/app/(app)/p/[patientId]/family/actions";
import { useT } from "@/components/i18n-provider";
import { Button } from "@/components/ui/button";

export function RevokeInviteButton({ patientId, inviteId }: { patientId: string; inviteId: string }) {
  const t = useT();
  const [pending, startTransition] = useTransition();
  return (
    <Button
      variant="ghost"
      size="touch"
      disabled={pending}
      onClick={() => startTransition(async () => void (await revokeInviteAction({ patientId, inviteId })))}
    >
      {t("invite.revoke")}
    </Button>
  );
}
