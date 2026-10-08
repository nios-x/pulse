"use client";

import { useActionState } from "react";
import { addMedicationAction, updateMedicationAction } from "@/app/(app)/p/[patientId]/meds/actions";
import { useT } from "@/components/i18n-provider";
import { ChoiceChips } from "@/components/form/choice-chips";
import { FormMessage, TextField } from "@/components/form/text-field";
import { Button } from "@/components/ui/button";
import type { MessageKey } from "@/lib/i18n";
import type { FormState } from "@/lib/validators";

const PRESET_TIMES = ["08:00", "14:00", "20:00"] as const;

/** Add a medicine, or edit one when `medication` is given. */
export function MedicationForm({
  patientId,
  medication,
  timeLabels,
}: {
  patientId: string;
  medication?: { id: string; name: string; dose: string; times: string[] };
  timeLabels: Record<string, string>;
}) {
  const t = useT();
  const [state, action, pending] = useActionState<FormState, FormData>(
    medication ? updateMedicationAction : addMedicationAction,
    {}
  );
  const err = (key?: MessageKey) => (key ? t(key) : undefined);
  const custom = medication?.times.find((x) => !PRESET_TIMES.includes(x as (typeof PRESET_TIMES)[number]));
  const formKey = state.ok && !medication ? `saved-${state.values?.name}` : "form";

  return (
    <form key={formKey} action={action} className="flex flex-col gap-4">
      <input type="hidden" name="patientId" value={patientId} />
      {medication ? <input type="hidden" name="medicationId" value={medication.id} /> : null}
      <div className="grid grid-cols-[3fr_2fr] gap-3">
        <TextField
          name="name"
          id={medication ? `name-${medication.id}` : undefined}
          label={t("meds.name")}
          placeholder="Metformin"
          defaultValue={state.ok ? medication?.name : (state.values?.name ?? medication?.name)}
          error={err(state.fieldErrors?.name)}
          required
        />
        <TextField
          name="dose"
          id={medication ? `dose-${medication.id}` : undefined}
          label={t("meds.dose")}
          placeholder="500 mg"
          defaultValue={state.ok ? medication?.dose : (state.values?.dose ?? medication?.dose)}
          error={err(state.fieldErrors?.dose)}
        />
      </div>
      <ChoiceChips
        name="times"
        type="checkbox"
        columns={3}
        legend={t("meds.times")}
        defaultValue={medication?.times ?? ["08:00"]}
        chipClassName="justify-center"
        options={PRESET_TIMES.map((time) => ({ value: time, label: timeLabels[time] }))}
      />
      <label className="flex items-center justify-between gap-3 text-base">
        {t("meds.customTime")}
        <input
          type="time"
          name="customTime"
          defaultValue={custom}
          className="h-11 rounded-lg border border-input bg-card px-3"
        />
      </label>
      <FormMessage>{err(state.fieldErrors?.times ?? state.error)}</FormMessage>
      {state.ok ? (
        <FormMessage tone="ok">{t("meds.saved", { name: state.values?.name ?? "" })}</FormMessage>
      ) : null}
      <Button type="submit" size="xl" disabled={pending}>
        {pending ? t("common.wait") : medication ? t("common.save") : t("meds.add")}
      </Button>
    </form>
  );
}
