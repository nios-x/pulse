"use client";

import { useActionState } from "react";
import { UserIcon, UsersIcon } from "lucide-react";
import { createPatientAction } from "@/app/(app)/new/actions";
import { useT } from "@/components/i18n-provider";
import { ChoiceChips } from "@/components/form/choice-chips";
import { FormMessage, TextField } from "@/components/form/text-field";
import { Button } from "@/components/ui/button";
import type { MessageKey } from "@/lib/i18n";
import type { FormState } from "@/lib/validators";

export function CreatePatientForm() {
  const t = useT();
  const [state, action, pending] = useActionState<FormState, FormData>(createPatientAction, {});
  const err = (key?: MessageKey) => (key ? t(key) : undefined);

  return (
    <form action={action} className="flex flex-col gap-5" noValidate>
      <FormMessage>{err(state.error)}</FormMessage>
      <ChoiceChips
        name="forWhom"
        legend={t("profile.forWhom")}
        defaultValue={state.values?.forWhom ?? "family"}
        columns={2}
        chipClassName="min-h-24"
        options={[
          {
            value: "me",
            icon: <UserIcon className="size-6" aria-hidden />,
            label: t("profile.forMe"),
            description: t("profile.forMeHint"),
          },
          {
            value: "family",
            icon: <UsersIcon className="size-6" aria-hidden />,
            label: t("profile.forFamily"),
            description: t("profile.forFamilyHint"),
          },
        ]}
      />
      {state.fieldErrors?.forWhom ? (
        <p className="-mt-3 text-sm text-destructive">{err(state.fieldErrors.forWhom)}</p>
      ) : null}
      <TextField
        name="name"
        label={t("profile.name")}
        hint={t("profile.nameHint")}
        defaultValue={state.values?.name}
        error={err(state.fieldErrors?.name)}
        required
      />
      <div className="grid grid-cols-2 gap-3">
        <TextField
          name="birthYear"
          inputMode="numeric"
          maxLength={4}
          label={t("profile.birthYear")}
          placeholder="1964"
          defaultValue={state.values?.birthYear}
          error={err(state.fieldErrors?.birthYear)}
        />
        <TextField
          name="city"
          label={t("profile.city")}
          placeholder={t("profile.cityPlaceholder")}
          defaultValue={state.values?.city}
          error={err(state.fieldErrors?.city)}
        />
      </div>
      <Button type="submit" size="xl" disabled={pending}>
        {pending ? t("common.wait") : t("profile.create")}
      </Button>
    </form>
  );
}
