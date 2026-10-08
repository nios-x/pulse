"use client";

import { useActionState, useState } from "react";
import { CameraIcon, RotateCcwIcon, SparklesIcon, UtensilsIcon } from "lucide-react";
import { analyzeMealPhotoAction, logMealAction } from "@/app/(app)/p/[patientId]/log/actions";
import { useLocale, useT } from "@/components/i18n-provider";
import { ChoiceChips } from "@/components/form/choice-chips";
import { FormMessage } from "@/components/form/text-field";
import { MealCamera } from "@/components/log/meal-camera";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { describeDetected, type DetectedFood } from "@/lib/food-photo";
import { FOODS, type FoodKey, type MealSlotKey } from "@/lib/foods";
import type { MessageKey } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import type { FormState } from "@/lib/validators";

const SLOTS: MealSlotKey[] = ["breakfast", "lunch", "snack", "dinner"];

type Photo =
  | { status: "analyzing"; url: string }
  | { status: "done"; url: string; items: DetectedFood[]; keys: FoodKey[] }
  | { status: "error"; url: string; error: MessageKey };

const CARB_STYLE = {
  high: "bg-destructive/10 text-destructive",
  medium: "bg-warning/25 text-warning-foreground",
  low: "bg-success/15 text-foreground",
} as const;

/**
 * Meal logging: take a photo (AI finds the foods), check, Save. Three taps.
 * The food chips stay below for fixing the result or logging without a photo.
 */
export function MealCard({
  patientId,
  defaultSlot,
  photoEnabled,
}: {
  patientId: string;
  defaultSlot: MealSlotKey;
  photoEnabled: boolean;
}) {
  const t = useT();
  const locale = useLocale();
  const [cameraOpen, setCameraOpen] = useState(false);
  const [photo, setPhoto] = useState<Photo | null>(null);
  const [state, action, pending] = useActionState<FormState, FormData>(async (prev, formData) => {
    const result = await logMealAction(prev, formData);
    if (result.ok) setPhoto(null); // the next meal starts fresh
    return result;
  }, {});
  const error = state.fieldErrors?.items ?? state.fieldErrors?.slot ?? state.error;
  const detected = photo?.status === "done" ? photo : null;

  async function analyze(url: string) {
    setCameraOpen(false);
    setPhoto({ status: "analyzing", url });
    const result = await analyzeMealPhotoAction({ patientId, image: url }).catch(() => null);
    if (!result) return setPhoto({ status: "error", url, error: "photo.error.failed" });
    setPhoto(result.ok ? { status: "done", url, items: result.items, keys: result.keys } : { status: "error", url, error: result.error });
  }

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
          {detected ? <input type="hidden" name="details" value={JSON.stringify(detected.items)} /> : null}
          <ChoiceChips
            name="slot"
            columns={4}
            defaultValue={defaultSlot}
            chipClassName="justify-center px-1 text-center text-sm leading-tight"
            options={SLOTS.map((s) => ({ value: s, label: t(`slot.${s}`) }))}
          />

          {photoEnabled ? (
            photo ? (
              <div className="flex flex-col gap-3 rounded-xl border bg-muted/40 p-3" aria-live="polite">
                <div className="flex gap-3">
                  {/* eslint-disable-next-line @next/next/no-img-element -- local data URL preview */}
                  <img src={photo.url} alt={t("photo.preview")} className="size-24 shrink-0 rounded-lg object-cover" />
                  <div className="flex min-w-0 flex-1 flex-col gap-1">
                    {photo.status === "analyzing" ? (
                      <p className="flex items-center gap-2 text-base">
                        <Spinner className="size-5" />
                        {t("photo.finding")}
                      </p>
                    ) : photo.status === "error" ? (
                      <p className="text-base text-destructive">{t(photo.error)}</p>
                    ) : (
                      <>
                        <p className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground">
                          <SparklesIcon className="size-4" aria-hidden />
                          {t("photo.found")}
                        </p>
                        <ul className="flex flex-col gap-1">
                          {photo.items.map((item, i) => (
                            <li key={i} className="flex flex-wrap items-center gap-x-2 text-base leading-snug">
                              <span className="font-medium">{describeDetected(item, locale)}</span>
                              <span className={cn("rounded px-1.5 text-xs font-medium", CARB_STYLE[item.carb])}>
                                {t(`photo.carb.${item.carb}`)}
                              </span>
                            </li>
                          ))}
                        </ul>
                      </>
                    )}
                  </div>
                </div>
                {photo.status !== "analyzing" ? (
                  <Button type="button" variant="outline" size="touch" onClick={() => setCameraOpen(true)}>
                    <RotateCcwIcon aria-hidden />
                    {t("photo.retake")}
                  </Button>
                ) : null}
                <p className="text-xs text-muted-foreground">{t("photo.privacy")}</p>
              </div>
            ) : (
              <Button type="button" size="xl" variant="secondary" className="h-16" onClick={() => setCameraOpen(true)}>
                <CameraIcon aria-hidden />
                {t("photo.take")}
              </Button>
            )
          ) : null}

          <ChoiceChips
            key={detected ? `photo-${detected.keys.join(",")}-${detected.url.length}` : "manual"}
            name="items"
            type="checkbox"
            columns={3}
            defaultValue={detected?.keys}
            legend={
              <span className="text-sm font-normal text-muted-foreground">
                {detected ? t("photo.fix") : photoEnabled ? t("photo.orTap") : t("log.mealPick")}
              </span>
            }
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
          <Button type="submit" size="xl" disabled={pending || photo?.status === "analyzing"}>
            {pending ? t("common.wait") : t("common.save")}
          </Button>
        </form>
      </CardContent>
      {cameraOpen ? <MealCamera onPhoto={(url) => void analyze(url)} onClose={() => setCameraOpen(false)} /> : null}
    </Card>
  );
}
