"use client";

import { useActionState, useState } from "react";
import { DropletIcon } from "lucide-react";
import { logGlucoseAction, type GlucoseState } from "@/app/(app)/p/[patientId]/log/actions";
import { GlucoseAlertScreen } from "@/components/safety/glucose-alert-screen";
import { useT } from "@/components/i18n-provider";
import { ChoiceChips } from "@/components/form/choice-chips";
import { FormMessage } from "@/components/form/text-field";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { GlucoseContext } from "@/db/schema";
import { cn } from "@/lib/utils";

export function SugarCard({
  patientId,
  defaultContext,
}: {
  patientId: string;
  defaultContext: GlucoseContext;
}) {
  const t = useT();
  const [state, action, pending] = useActionState<GlucoseState, FormData>(logGlucoseAction, {});
  // The alert screen stays open until the person taps "I understand".
  const [dismissed, setDismissed] = useState<GlucoseState | null>(null);
  const error = state.fieldErrors?.mgdl ?? state.fieldErrors?.context ?? state.error;

  return (
    <Card>
      {state.alert && dismissed !== state ? (
        <GlucoseAlertScreen alert={state.alert} contacts={state.contacts ?? []} onClose={() => setDismissed(state)} />
      ) : null}
      <CardHeader>
        <CardTitle className="flex items-center gap-3 text-xl">
          <span className="flex size-10 items-center justify-center rounded-xl bg-alert-wash text-alert">
            <DropletIcon className="size-5" aria-hidden />
          </span>
          {t("log.sugar")}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form action={action} className="flex flex-col gap-4">
          <input type="hidden" name="patientId" value={patientId} />
          {/* The number sits right against its unit, the pair centred in the box. */}
          <label
            className={cn(
              "flex items-baseline justify-center gap-2 rounded-2xl bg-violet-wash px-4 py-3 transition-shadow focus-within:ring-2 focus-within:ring-violet/50",
              state.fieldErrors?.mgdl && "ring-2 ring-alert/60 focus-within:ring-alert/60"
            )}
          >
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
              className="figure h-20 w-[3.2ch] min-w-0 bg-transparent text-right text-6xl! font-bold outline-none placeholder:text-violet-soft/50 aria-invalid:text-alert-ink"
              required
            />
            <span className="font-heading text-xl font-medium text-ink-2">mg/dL</span>
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
