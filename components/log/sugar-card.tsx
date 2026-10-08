"use client";

import { useActionState } from "react";
import { DropletIcon } from "lucide-react";
import { logGlucoseAction } from "@/app/(app)/p/[patientId]/log/actions";
import { useT } from "@/components/i18n-provider";
import { ChoiceChips } from "@/components/form/choice-chips";
import { FormMessage } from "@/components/form/text-field";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { GlucoseContext } from "@/db/schema";
import type { FormState } from "@/lib/validators";

export function SugarCard({
  patientId,
  defaultContext,
}: {
  patientId: string;
  defaultContext: GlucoseContext;
}) {
  const t = useT();
  const [state, action, pending] = useActionState<FormState, FormData>(logGlucoseAction, {});
  const error = state.fieldErrors?.mgdl ?? state.fieldErrors?.context ?? state.error;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <DropletIcon className="size-5 text-destructive" aria-hidden />
          {t("log.sugar")}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form action={action} className="flex flex-col gap-4">
          <input type="hidden" name="patientId" value={patientId} />
          <label className="flex items-baseline gap-3">
            <span className="sr-only">{t("log.sugarLabel")}</span>
            <input
              name="mgdl"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={3}
              autoComplete="off"
              placeholder="000"
              defaultValue={state.ok ? "" : state.values?.mgdl}
              aria-invalid={state.fieldErrors?.mgdl ? true : undefined}
              className="h-20 w-40 rounded-xl border border-input bg-card px-4 text-5xl! font-semibold tabular-nums outline-none placeholder:text-muted-foreground/40 focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 aria-invalid:border-destructive"
              required
            />
            <span className="text-lg text-muted-foreground">mg/dL</span>
          </label>
          <ChoiceChips
            name="context"
            columns={3}
            defaultValue={state.values?.context ?? defaultContext}
            chipClassName="justify-center text-center px-1"
            options={[
              { value: "fasting", label: t("context.fasting") },
              { value: "after_meal", label: t("context.after_meal") },
              { value: "random", label: t("context.random") },
            ]}
          />
          <FormMessage>{error ? t(error) : undefined}</FormMessage>
          {state.ok ? (
            <FormMessage tone="ok">{t("log.savedSugar", { mgdl: state.values?.mgdl ?? "" })}</FormMessage>
          ) : null}
          <Button type="submit" size="xl" disabled={pending}>
            {pending ? t("common.wait") : t("common.save")}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
