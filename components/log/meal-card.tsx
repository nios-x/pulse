"use client";

import { useActionState } from "react";
import { UtensilsIcon } from "lucide-react";
import { logMealAction } from "@/app/(app)/p/[patientId]/log/actions";
import { useLocale, useT } from "@/components/i18n-provider";
import { ChoiceChips } from "@/components/form/choice-chips";
import { FormMessage } from "@/components/form/text-field";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FOODS, type MealSlotKey } from "@/lib/foods";
import type { FormState } from "@/lib/validators";

const SLOTS: MealSlotKey[] = ["breakfast", "lunch", "snack", "dinner"];

export function MealCard({ patientId, defaultSlot }: { patientId: string; defaultSlot: MealSlotKey }) {
  const t = useT();
  const locale = useLocale();
  const [state, action, pending] = useActionState<FormState, FormData>(logMealAction, {});
  const error = state.fieldErrors?.items ?? state.fieldErrors?.slot ?? state.error;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <UtensilsIcon className="size-5 text-chart-2" aria-hidden />
          {t("log.meal")}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form action={action} className="flex flex-col gap-4">
          <input type="hidden" name="patientId" value={patientId} />
          <ChoiceChips
            name="slot"
            columns={4}
            defaultValue={defaultSlot}
            chipClassName="justify-center px-1 text-center text-sm leading-tight"
            options={SLOTS.map((s) => ({ value: s, label: t(`slot.${s}`) }))}
          />
          <ChoiceChips
            name="items"
            type="checkbox"
            columns={3}
            legend={<span className="text-sm font-normal text-muted-foreground">{t("log.mealPick")}</span>}
            chipClassName="min-h-16 flex-col justify-center gap-0 px-1 text-center text-sm leading-tight"
            options={FOODS.map((f) => ({
              value: f.key,
              icon: (
                <span aria-hidden className="text-xl leading-none">
                  {f.emoji}
                </span>
              ),
              label: f[locale],
            }))}
          />
          <FormMessage>{error ? t(error) : undefined}</FormMessage>
          {state.ok ? <FormMessage tone="ok">{t("log.savedMeal")}</FormMessage> : null}
          <Button type="submit" size="xl" disabled={pending}>
            {pending ? t("common.wait") : t("common.save")}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
