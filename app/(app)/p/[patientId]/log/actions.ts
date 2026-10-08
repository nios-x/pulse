"use server";

import { refresh } from "next/cache";
import { db } from "@/db";
import { dailyCheckins, glucoseReadings, meals } from "@/db/schema";
import { istDate } from "@/lib/dates";
import { requirePermission } from "@/lib/permissions";
import {
  checkinSchema,
  glucoseSchema,
  mealSchema,
  readForm,
  toFieldErrors,
  type FormState,
} from "@/lib/validators";

export async function logGlucoseAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const raw = readForm(formData, ["patientId", "mgdl", "context"]);
  const parsed = glucoseSchema.safeParse(raw);
  if (!parsed.success) return { fieldErrors: toFieldErrors(parsed.error), values: raw };
  const { patientId, mgdl, context } = parsed.data;
  const { user } = await requirePermission(patientId, "log_glucose");

  await db.insert(glucoseReadings).values({ patientId, loggedBy: user.id, mgdl, context });
  refresh();
  return { ok: true, values: { mgdl: String(mgdl) } };
}

export async function logMealAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = mealSchema.safeParse({
    patientId: formData.get("patientId"),
    slot: formData.get("slot"),
    items: formData.getAll("items"),
  });
  if (!parsed.success) return { fieldErrors: toFieldErrors(parsed.error) };
  const { patientId, slot, items } = parsed.data;
  const { user } = await requirePermission(patientId, "log_meals");

  await db.insert(meals).values({ patientId, loggedBy: user.id, slot, items });
  refresh();
  return { ok: true, values: { slot } };
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
