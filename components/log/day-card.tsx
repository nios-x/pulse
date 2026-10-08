"use client";

import { useState, useTransition } from "react";
import { FootprintsIcon } from "lucide-react";
import { saveCheckinAction } from "@/app/(app)/p/[patientId]/log/actions";
import { useT } from "@/components/i18n-provider";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const SLEEP_FACES = [
  { value: 1, face: "😣", key: "sleep.bad" },
  { value: 2, face: "😐", key: "sleep.okay" },
  { value: 3, face: "😊", key: "sleep.good" },
] as const;

/** "Walked today?" and sleep: each is a single tap that saves right away. */
export function DayCard({
  patientId,
  walked: initialWalked,
  sleep: initialSleep,
}: {
  patientId: string;
  walked: boolean | null;
  sleep: number | null;
}) {
  const t = useT();
  const [pending, startTransition] = useTransition();
  const [walked, setWalked] = useState(initialWalked);
  const [sleep, setSleep] = useState(initialSleep);

  const save = (patch: { walked?: boolean; sleep?: 1 | 2 | 3 }, undo: () => void) =>
    startTransition(async () => {
      const result = await saveCheckinAction({ patientId, ...patch });
      if (!result.ok) undo();
    });

  const pill = (active: boolean) =>
    cn(
      "flex min-h-14 items-center justify-center gap-2 rounded-xl border text-base font-medium transition-colors",
      active ? "border-primary bg-primary text-primary-foreground" : "bg-card hover:bg-muted"
    );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <FootprintsIcon className="size-5 text-success" aria-hidden />
          {t("log.day")}
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-5" aria-busy={pending}>
        <div className="flex flex-col gap-2">
          <p className="text-base font-medium">{t("log.walked")}</p>
          <div className="grid grid-cols-2 gap-2">
            {[true, false].map((value) => (
              <button
                key={String(value)}
                type="button"
                aria-pressed={walked === value}
                className={pill(walked === value)}
                onClick={() => {
                  const previous = walked;
                  setWalked(value);
                  save({ walked: value }, () => setWalked(previous));
                }}
              >
                {value ? t("common.yes") : t("common.no")}
              </button>
            ))}
          </div>
        </div>
        <div className="flex flex-col gap-2">
          <p className="text-base font-medium">{t("log.sleep")}</p>
          <div className="grid grid-cols-3 gap-2">
            {SLEEP_FACES.map(({ value, face, key }) => (
              <button
                key={value}
                type="button"
                aria-pressed={sleep === value}
                className={cn(pill(sleep === value), "min-h-20 flex-col gap-0")}
                onClick={() => {
                  const previous = sleep;
                  setSleep(value);
                  save({ sleep: value }, () => setSleep(previous));
                }}
              >
                <span aria-hidden className="text-3xl leading-tight">
                  {face}
                </span>
                <span className="text-sm">{t(key)}</span>
              </button>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
