"use client";

import { useState, useTransition } from "react";
import { FootprintsIcon, FrownIcon, MehIcon, SmileIcon } from "lucide-react";
import { saveCheckinAction } from "@/app/(app)/p/[patientId]/log/actions";
import { useT } from "@/components/i18n-provider";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const SLEEP_FACES = [
  { value: 1, Face: FrownIcon, key: "sleep.bad" },
  { value: 2, Face: MehIcon, key: "sleep.okay" },
  { value: 3, Face: SmileIcon, key: "sleep.good" },
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
      "flex min-h-14 items-center justify-center gap-2 rounded-xl border text-base font-medium transition-[background-color,border-color,color] duration-200",
      active ? "border-violet bg-violet-wash text-violet-deep" : "border-transparent bg-card text-plum shadow-card hover:border-violet/40"
    );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-3 text-xl">
          <span className="flex size-10 items-center justify-center rounded-xl bg-mint-wash text-go">
            <FootprintsIcon className="size-5" aria-hidden />
          </span>
          {t("log.day")}
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-5" aria-busy={pending}>
        <div className="flex flex-col gap-2">
          <p className="font-heading text-base font-semibold text-plum">{t("log.walked")}</p>
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
          <p className="font-heading text-base font-semibold text-plum">{t("log.sleep")}</p>
          <div className="grid grid-cols-3 gap-2">
            {SLEEP_FACES.map(({ value, Face, key }) => (
              <button
                key={value}
                type="button"
                aria-pressed={sleep === value}
                className={cn(pill(sleep === value), "min-h-20 flex-col gap-1")}
                onClick={() => {
                  const previous = sleep;
                  setSleep(value);
                  save({ sleep: value }, () => setSleep(previous));
                }}
              >
                <Face className="size-8" aria-hidden />
                <span className="text-sm">{t(key)}</span>
              </button>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
