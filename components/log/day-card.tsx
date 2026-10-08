"use client";

import { useState, useTransition, type ComponentType } from "react";
import { CheckIcon, FootprintsIcon, MoonIcon, SunIcon } from "lucide-react";
import { saveCheckinAction } from "@/app/(app)/p/[patientId]/log/actions";
import { useT } from "@/components/i18n-provider";
import { FormMessage } from "@/components/form/text-field";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatHours } from "@/lib/format";
import { cn } from "@/lib/utils";
import { MAX_SLEEP_MINUTES } from "@/lib/validators";

const MAX_STEPS = 100_000;

/** "7" or "6.5" hours -> minutes, or null if it is not a number of hours we accept. */
function parseHours(text: string): number | null {
  if (!/^\d{1,2}(\.\d)?$/.test(text)) return null;
  const minutes = Math.round(Number(text) * 60);
  return minutes <= MAX_SLEEP_MINUTES ? minutes : null;
}

/** Today's step count and last night's hours of sleep, side by side, saved together. */
export function DayCard({
  patientId,
  steps: initialSteps,
  sleepMinutes: initialSleep,
}: {
  patientId: string;
  steps: number | null;
  sleepMinutes: number | null;
}) {
  const t = useT();
  const [pending, startTransition] = useTransition();
  const [steps, setSteps] = useState(initialSteps === null ? "" : String(initialSteps));
  const [savedSteps, setSavedSteps] = useState(initialSteps);
  const [stepsError, setStepsError] = useState(false);
  const [sleep, setSleep] = useState(initialSleep === null ? "" : formatHours(initialSleep));
  const [savedSleep, setSavedSleep] = useState(initialSleep);
  const [sleepError, setSleepError] = useState(false);
  const [justSaved, setJustSaved] = useState(false);

  const stepsSaved = savedSteps !== null && steps === String(savedSteps);
  const sleepSaved = savedSleep !== null && sleep === formatHours(savedSleep);
  // An emptied box is left alone rather than saved: there is no "unknown" to save.
  const stepsChanged = steps !== "" && !stepsSaved;
  const sleepChanged = sleep !== "" && !sleepSaved;

  const save = () => {
    const stepsValue = Number(steps);
    const badSteps = stepsChanged && (!Number.isInteger(stepsValue) || stepsValue > MAX_STEPS);
    const minutes = sleepChanged ? parseHours(sleep) : null;
    const badSleep = sleepChanged && minutes === null;
    setStepsError(badSteps);
    setSleepError(badSleep);
    if (badSteps || badSleep) return;

    const patch = {
      ...(stepsChanged ? { steps: stepsValue } : {}),
      ...(minutes !== null ? { sleepMinutes: minutes } : {}),
    };
    startTransition(async () => {
      const result = await saveCheckinAction({ patientId, ...patch });
      if (!result.ok) {
        setStepsError(stepsChanged);
        setSleepError(sleepChanged);
        return;
      }
      if (patch.steps !== undefined) setSavedSteps(patch.steps);
      if (patch.sleepMinutes !== undefined) {
        setSavedSleep(patch.sleepMinutes);
        setSleep(formatHours(patch.sleepMinutes));
      }
      setJustSaved(true);
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-3 text-xl">
          <span className="flex size-10 items-center justify-center rounded-xl bg-mint-wash text-go">
            <SunIcon className="size-5" aria-hidden />
          </span>
          {t("log.day")}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form
          className="flex flex-col gap-4"
          aria-busy={pending}
          onSubmit={(e) => {
            e.preventDefault();
            save();
          }}
        >
          <div className="grid grid-cols-2 gap-3">
            <FigureTile
              id="day-steps"
              icon={FootprintsIcon}
              title={t("log.stepsShort")}
              label={t("log.steps")}
              unit={t("log.stepsUnit")}
              tint="bg-mint-wash text-go focus-within:ring-go/50"
              inputMode="numeric"
              maxLength={6}
              value={steps}
              onChange={(text) => {
                setSteps(text.replace(/\D/g, ""));
                setStepsError(false);
                setJustSaved(false);
              }}
              invalid={stepsError}
              saved={stepsSaved}
              savedLabel={t("common.saved")}
            />
            <FigureTile
              id="day-sleep"
              icon={MoonIcon}
              title={t("log.sleepShort")}
              label={t("log.sleep")}
              unit={t("log.sleepUnit")}
              tint="bg-violet-wash text-violet-deep focus-within:ring-violet/50"
              inputMode="decimal"
              maxLength={4}
              value={sleep}
              onChange={(text) => {
                // Digits and one decimal point; some keyboards type a comma for it.
                setSleep(text.replace(",", ".").replace(/[^\d.]/g, "").replace(/(\..*)\./g, "$1"));
                setSleepError(false);
                setJustSaved(false);
              }}
              invalid={sleepError}
              saved={sleepSaved}
              savedLabel={t("common.saved")}
            />
          </div>
          {stepsError ? <FormMessage>{t("log.error.steps")}</FormMessage> : null}
          {sleepError ? <FormMessage>{t("log.error.sleep")}</FormMessage> : null}
          {justSaved && !stepsError && !sleepError ? <FormMessage tone="ok">{t("common.saved")}</FormMessage> : null}
          <Button type="submit" size="xl" disabled={pending || (!stepsChanged && !sleepChanged)}>
            {pending ? t("common.wait") : t("common.save")}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

/** One tinted tile: a short title, a big centred number and its unit underneath. */
function FigureTile({
  id,
  icon: Icon,
  title,
  label,
  unit,
  tint,
  inputMode,
  maxLength,
  value,
  onChange,
  invalid,
  saved,
  savedLabel,
}: {
  id: string;
  icon: ComponentType<{ className?: string; "aria-hidden"?: boolean }>;
  title: string;
  /** The full question, read out by screen readers. */
  label: string;
  unit: string;
  tint: string;
  inputMode: "numeric" | "decimal";
  maxLength: number;
  value: string;
  onChange: (text: string) => void;
  invalid: boolean;
  saved: boolean;
  savedLabel: string;
}) {
  return (
    <label
      htmlFor={id}
      className={cn(
        "flex min-w-0 flex-col gap-1 rounded-2xl px-3 pt-3 pb-2.5 transition-shadow focus-within:ring-2",
        tint,
        invalid && "ring-2 ring-alert/60 focus-within:ring-alert/60"
      )}
    >
      <span className="flex items-center gap-1.5 text-sm font-semibold">
        <Icon className="size-4 shrink-0" aria-hidden />
        <span className="min-w-0 truncate">{title}</span>
        {saved ? (
          <span className="ml-auto flex size-5 shrink-0 items-center justify-center rounded-full bg-go text-go-foreground">
            <CheckIcon className="size-3.5" strokeWidth={3} aria-hidden />
            <span className="sr-only">{savedLabel}</span>
          </span>
        ) : null}
      </span>
      <input
        id={id}
        aria-label={label}
        inputMode={inputMode}
        pattern={inputMode === "numeric" ? "[0-9]*" : undefined}
        maxLength={maxLength}
        autoComplete="off"
        placeholder="0"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-invalid={invalid ? true : undefined}
        className="figure h-14 w-full min-w-0 bg-transparent text-center text-4xl! font-bold outline-none placeholder:text-ink-3/40 aria-invalid:text-alert-ink"
      />
      <span className="text-center text-sm font-medium text-ink-2">{unit}</span>
    </label>
  );
}
