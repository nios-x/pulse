"use server";

import { refresh } from "next/cache";
import { db } from "@/db";
import { dailyCheckins, glucoseReadings, meals } from "@/db/schema";
import { callableMembers, createAlert } from "@/lib/alerts";
import { istDate } from "@/lib/dates";
import { keysFromDetection, type DetectedFood } from "@/lib/food-photo";
import type { FoodKey } from "@/lib/foods";
import { detectFoods, foodPhotoEnabled } from "@/lib/gemini";
import { requirePermission } from "@/lib/permissions";
import { evaluateGlucose, type SafetyResult } from "@/lib/safety";
import {
  checkinSchema,
  glucoseSchema,
  mealPhotoSchema,
  mealSchema,
  readForm,
  toFieldErrors,
  type FormState,
} from "@/lib/validators";

export type GlucoseState = FormState & {
  alert?: SafetyResult & { mgdl: number };
  contacts?: { name: string; phone: string }[];
};

export async function logGlucoseAction(_prev: GlucoseState, formData: FormData): Promise<GlucoseState> {
  const raw = readForm(formData, ["patientId", "mgdl", "context"]);
  const parsed = glucoseSchema.safeParse(raw);
  if (!parsed.success) return { fieldErrors: toFieldErrors(parsed.error), values: raw };
  const { patientId, mgdl, context } = parsed.data;
  const { user, patient } = await requirePermission(patientId, "log_glucose");

  const [reading] = await db
    .insert(glucoseReadings)
    .values({ patientId, loggedBy: user.id, mgdl, context })
    .returning({ id: glucoseReadings.id });

  // Safety net: a dangerous reading writes an alert (bell for caregivers) and
  // opens a full-screen message for whoever logged it.
  const result = evaluateGlucose(mgdl, patient);
  let contacts: GlucoseState["contacts"];
  if (result) {
    await createAlert({ patientId, loggedBy: user.id, ...result, sourceId: reading.id });
    contacts = (await callableMembers(patientId, user.id)).map((m) => ({ name: m.name, phone: m.phone! }));
  }
  refresh();
  return {
    ok: true,
    values: { mgdl: String(mgdl) },
    ...(result ? { alert: { ...result, mgdl }, contacts } : {}),
  };
}

export async function logMealAction(_prev: FormState, formData: FormData): Promise<FormState> {
  let details: unknown;
  try {
    const raw = formData.get("details");
    details = typeof raw === "string" && raw ? JSON.parse(raw) : undefined;
  } catch {
    details = undefined;
  }
  const parsed = mealSchema.safeParse({
    patientId: formData.get("patientId"),
    slot: formData.get("slot"),
    items: formData.getAll("items"),
    details,
  });
  if (!parsed.success) return { fieldErrors: toFieldErrors(parsed.error) };
  const { patientId, slot, items } = parsed.data;
  const { user } = await requirePermission(patientId, "log_meals");

  await db.insert(meals).values({
    patientId,
    loggedBy: user.id,
    slot,
    items,
    details: parsed.data.details?.length ? parsed.data.details : null,
  });
  refresh();
  return { ok: true, values: { slot } };
}

export type MealPhotoResult =
  | { ok: true; items: DetectedFood[]; keys: FoodKey[] }
  | { ok: false; error: "photo.error.notFood" | "photo.error.failed" | "photo.error.tooBig" | "photo.error.off" };

/**
 * Sends a meal photo to Gemini and returns the foods it sees. Nothing is
 * saved here: the person checks the result and taps Save.
 */
export async function analyzeMealPhotoAction(input: { patientId: string; image: string }): Promise<MealPhotoResult> {
  const parsed = mealPhotoSchema.safeParse(input);
  if (!parsed.success) {
    const tooBig = parsed.error.issues.some((i) => i.message === "photo.error.tooBig");
    return { ok: false, error: tooBig ? "photo.error.tooBig" : "photo.error.failed" };
  }
  await requirePermission(parsed.data.patientId, "log_meals");
  if (!foodPhotoEnabled()) return { ok: false, error: "photo.error.off" };

  const [header, base64] = parsed.data.image.split(",");
  const mimeType = header.slice("data:".length, header.indexOf(";"));
  const detection = await detectFoods(base64, mimeType);
  if (!detection) return { ok: false, error: "photo.error.failed" };
  if (!detection.is_food || detection.items.length === 0) return { ok: false, error: "photo.error.notFood" };
  return { ok: true, items: detection.items, keys: keysFromDetection(detection.items) };
}

/** One tap saves: "walked today" or the sleep face. Upserts today's row. */
export async function saveCheckinAction(input: {
  patientId: string;
  walked?: boolean;
  sleep?: 1 | 2 | 3;
}): Promise<{ ok: boolean }> {
  const parsed = checkinSchema.safeParse(input);
  if (!parsed.success) return { ok: false };
  const { patientId, walked, sleep } = parsed.data;
  const { user } = await requirePermission(patientId, "log_checkin");

  const date = istDate(new Date());
  const patch = {
    ...(walked !== undefined ? { walked } : {}),
    ...(sleep !== undefined ? { sleep } : {}),
  };
  await db
    .insert(dailyCheckins)
    .values({ patientId, loggedBy: user.id, date, ...patch })
    .onConflictDoUpdate({
      target: [dailyCheckins.patientId, dailyCheckins.date],
      set: { ...patch, loggedBy: user.id },
    });
  refresh();
  return { ok: true };
}
