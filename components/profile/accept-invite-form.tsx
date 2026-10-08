"use client";

import { useActionState } from "react";
import { acceptInviteAction } from "@/app/join/[code]/actions";
import { useT } from "@/components/i18n-provider";
import { FormMessage } from "@/components/form/text-field";
import { Button } from "@/components/ui/button";
import type { FormState } from "@/lib/validators";

export function AcceptInviteForm({ code }: { code: string }) {
  const t = useT();
  const [state, action, pending] = useActionState<FormState, FormData>(acceptInviteAction, {});
  return (
    <form action={action} className="flex flex-col gap-3">
      <input type="hidden" name="code" value={code} />
      <FormMessage>{state.error ? t(state.error) : undefined}</FormMessage>
      <Button type="submit" size="xl" disabled={pending}>
        {pending ? t("common.wait") : t("join.accept")}
      </Button>
    </form>
  );
}
