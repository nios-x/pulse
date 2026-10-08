"use client";

import { useActionState } from "react";
import { Trash2Icon } from "lucide-react";
import { deletePatientAction, updateLimitsAction } from "@/app/(app)/p/[patientId]/settings/actions";
import { useT } from "@/components/i18n-provider";
import { FormMessage, TextField } from "@/components/form/text-field";
import { Button } from "@/components/ui/button";
import type { MessageKey } from "@/lib/i18n";
import type { FormState } from "@/lib/validators";

export function LimitsForm({ patientId, low, high }: { patientId: string; low: number; high: number }) {
  const t = useT();
  const [state, action, pending] = useActionState<FormState, FormData>(updateLimitsAction, {});
  const err = (key?: MessageKey) => (key ? t(key) : undefined);
  return (
    <form action={action} className="flex flex-col gap-3">
      <input type="hidden" name="patientId" value={patientId} />
      <div className="grid grid-cols-2 gap-3">
        <TextField
          name="glucoseLow"
          inputMode="numeric"
          label={t("settings.low")}
          defaultValue={state.values?.glucoseLow ?? String(low)}
          error={err(state.fieldErrors?.glucoseLow)}
        />
        <TextField
          name="glucoseHigh"
          inputMode="numeric"
          label={t("settings.high")}
          defaultValue={state.values?.glucoseHigh ?? String(high)}
          error={err(state.fieldErrors?.glucoseHigh)}
        />
      </div>
      {state.ok ? <FormMessage tone="ok">{t("common.saved")}</FormMessage> : null}
      <Button type="submit" size="touch" variant="secondary" disabled={pending}>
        {pending ? t("common.wait") : t("common.save")}
      </Button>
    </form>
  );
}

export function DeletePatientForm({ patientId, name }: { patientId: string; name: string }) {
  const t = useT();
  const [state, action, pending] = useActionState<FormState, FormData>(deletePatientAction, {});
  return (
    <form action={action} className="flex flex-col gap-3">
      <input type="hidden" name="patientId" value={patientId} />
      <TextField
        name="confirmName"
        label={t("settings.deleteConfirm", { name })}
        autoComplete="off"
        error={state.fieldErrors?.confirmName ? t(state.fieldErrors.confirmName) : undefined}
      />
      <FormMessage>{state.error ? t(state.error) : undefined}</FormMessage>
      <Button type="submit" size="touch" variant="destructive" disabled={pending}>
        <Trash2Icon aria-hidden />
        {pending ? t("common.wait") : t("settings.delete")}
      </Button>
    </form>
  );
}
