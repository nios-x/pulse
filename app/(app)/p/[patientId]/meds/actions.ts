"use server";

import { and, eq } from "drizzle-orm";
import { refresh } from "next/cache";
import { db } from "@/db";
import { medications, medLogs } from "@/db/schema";
import { istDate } from "@/lib/dates";
import { requirePermission } from "@/lib/permissions";
import {
  doseSchema,
  medicationRefSchema,
  medicationSchema,
  medicationUpdateSchema,
  toFieldErrors,
  type FormState,
} from "@/lib/validators";

function readMedication(formData: FormData) {
  const custom = String(formData.get("customTime") ?? "").trim();
  return {
    patientId: formData.get("patientId"),
    medicationId: formData.get("medicationId") ?? undefined,
    name: String(formData.get("name") ?? ""),
    dose: String(formData.get("dose") ?? ""),
    times: [...formData.getAll("times").map(String), ...(custom ? [custom] : [])],
  };
}

export async function addMedicationAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const raw = readMedication(formData);
  const parsed = medicationSchema.safeParse(raw);
  if (!parsed.success) {
    return { fieldErrors: toFieldErrors(parsed.error), values: { name: raw.name, dose: raw.dose } };
  }
  const { patientId, name, dose, times } = parsed.data;
  const { user } = await requirePermission(patientId, "manage_meds");

  await db.insert(medications).values({ patientId, loggedBy: user.id, name, dose, times });
  refresh();
  return { ok: true, values: { name } };
}

export async function updateMedicationAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const raw = readMedication(formData);
  const parsed = medicationUpdateSchema.safeParse(raw);
  if (!parsed.success) {
    return { fieldErrors: toFieldErrors(parsed.error), values: { name: raw.name, dose: raw.dose } };
  }
  const { patientId, medicationId, name, dose, times } = parsed.data;
  await requirePermission(patientId, "manage_meds");

  await db
    .update(medications)
    .set({ name, dose, times })
    .where(and(eq(medications.id, medicationId), eq(medications.patientId, patientId)));
  refresh();
  return { ok: true, values: { name } };
}

export async function stopMedicationAction(input: { patientId: string; medicationId: string }) {
  const parsed = medicationRefSchema.safeParse(input);
  if (!parsed.success) return { ok: false };
  const { patientId, medicationId } = parsed.data;
  await requirePermission(patientId, "manage_meds");

  await db
    .update(medications)
    .set({ active: false })
    .where(and(eq(medications.id, medicationId), eq(medications.patientId, patientId)));
  refresh();
  return { ok: true };
}

/** The big Taken button. Only today's scheduled slots can be ticked. */
export async function markDoseAction(input: {
  patientId: string;
  medicationId: string;
  slot: string;
  taken: boolean;
}) {
  const parsed = doseSchema.safeParse(input);
  if (!parsed.success) return { ok: false };
  const { patientId, medicationId, slot, taken } = parsed.data;
  const { user } = await requirePermission(patientId, "mark_dose");

  const [med] = await db
    .select({ times: medications.times })
    .from(medications)
    .where(and(eq(medications.id, medicationId), eq(medications.patientId, patientId), eq(medications.active, true)))
    .limit(1);
  if (!med || !med.times.includes(slot)) return { ok: false };

  const date = istDate(new Date());
  if (taken) {
    await db
      .insert(medLogs)
      .values({ patientId, loggedBy: user.id, medicationId, date, slot })
      .onConflictDoNothing();
  } else {
    await db
      .delete(medLogs)
      .where(and(eq(medLogs.medicationId, medicationId), eq(medLogs.date, date), eq(medLogs.slot, slot)));
  }
  refresh();
  return { ok: true };
}
