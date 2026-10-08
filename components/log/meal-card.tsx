"use client";

import { useActionState, useRef, useState } from "react";
import { CameraIcon, ImageUpIcon, RotateCcwIcon, SparklesIcon, UtensilsIcon } from "lucide-react";
import { analyzeMealPhotoAction, logMealAction } from "@/app/(app)/p/[patientId]/log/actions";
import { useLocale, useT } from "@/components/i18n-provider";
import { ChoiceChips } from "@/components/form/choice-chips";
import { FormMessage } from "@/components/form/text-field";
import { FoodIcon } from "@/components/log/food-icon";
import { fileToJpeg, MealCamera } from "@/components/log/meal-camera";
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
  high: "bg-alert-wash text-alert-ink",
  medium: "bg-watch-wash text-watch-ink",
  low: "bg-ok-wash text-ok-ink",
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
  const uploadRef = useRef<HTMLInputElement>(null);
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

  async function upload(file: File) {
    // Some formats (e.g. HEIC outside Safari) can't be decoded in the browser.
    const url = await fileToJpeg(file).catch(() => null);
    if (!url) return setPhoto({ status: "error", url: "", error: "photo.error.failed" });
    await analyze(url);
  }

  const photoButtons = (
    <div className="grid grid-cols-2 gap-2">
      <Button type="button" variant="outline" size="touch" onClick={() => setCameraOpen(true)}>
        {photo ? <RotateCcwIcon aria-hidden /> : <CameraIcon aria-hidden />}
        {t(photo ? "photo.retake" : "photo.take")}
      </Button>
      <Button type="button" variant="outline" size="touch" onClick={() => uploadRef.current?.click()}>
        <ImageUpIcon aria-hidden />
        {t("photo.upload")}
      </Button>
    </div>
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-3 text-xl">
          <span className="flex size-10 items-center justify-center rounded-xl bg-watch-wash text-watch">
            <UtensilsIcon className="size-5" aria-hidden />
          </span>
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
              <div className="flex flex-col gap-3 rounded-2xl bg-violet-wash/70 p-3" aria-live="polite">
                <div className="flex gap-3">
                  {photo.url ? (
                    // eslint-disable-next-line @next/next/no-img-element -- local data URL preview
                    <img src={photo.url} alt={t("photo.preview")} className="size-24 shrink-0 rounded-xl object-cover shadow-card" />
                  ) : null}
                  <div className="flex min-w-0 flex-1 flex-col gap-1">
                    {photo.status === "analyzing" ? (
                      <p className="flex items-center gap-2 text-base">
                        <Spinner className="size-5" />
                        {t("photo.finding")}
                      </p>
                    ) : photo.status === "error" ? (
                      <p className="text-base font-medium text-alert-ink">{t(photo.error)}</p>
                    ) : (
                      <>
                        <p className="flex items-center gap-1.5 text-sm font-medium text-violet-deep">
                          <SparklesIcon className="size-4" aria-hidden />
                          {t("photo.found")}
                        </p>
                        <ul className="flex flex-col gap-1">
                          {photo.items.map((item, i) => (
                            <li key={i} className="flex flex-wrap items-center gap-x-2 text-base leading-snug">
                              <span className="font-medium">{describeDetected(item, locale)}</span>
                              <span className={cn("rounded-full px-2 text-xs font-semibold", CARB_STYLE[item.carb])}>
                                {t(`photo.carb.${item.carb}`)}
                              </span>
                            </li>
                          ))}
                        </ul>
                      </>
                    )}
                  </div>
                </div>
                {photo.status !== "analyzing" ? photoButtons : null}
                <p className="text-xs text-ink-3">{t("photo.privacy")}</p>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                <Button
                  type="button"
                  size="xl"
                  variant="secondary"
                  className="h-18 border-2 border-dashed border-violet/35"
                  onClick={() => setCameraOpen(true)}
                >
                  <CameraIcon aria-hidden />
                  {t("photo.take")}
                </Button>
                <Button type="button" variant="outline" size="touch" onClick={() => uploadRef.current?.click()}>
                  <ImageUpIcon aria-hidden />
                  {t("photo.upload")}
                </Button>
              </div>
            )
          ) : null}

          <ChoiceChips
            key={detected ? `photo-${detected.keys.join(",")}-${detected.url.length}` : "manual"}
            name="items"
            type="checkbox"
            columns={3}
            defaultValue={detected?.keys}
            legend={
              <span className="text-sm font-normal text-ink-3">
                {detected ? t("photo.fix") : photoEnabled ? t("photo.orTap") : t("log.mealPick")}
              </span>
            }
            variant="tile"
            options={FOODS.map((f) => ({
              value: f.key,
              icon: <FoodIcon food={f.key} className="size-6" />,
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
      {photoEnabled ? (
        <input
          ref={uploadRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            e.target.value = ""; // picking the same file again still fires
            if (file) void upload(file);
          }}
        />
      ) : null}
      {cameraOpen ? <MealCamera onPhoto={(url) => void analyze(url)} onClose={() => setCameraOpen(false)} /> : null}
    </Card>
  );
}
