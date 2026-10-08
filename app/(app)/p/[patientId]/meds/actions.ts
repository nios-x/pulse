"use server";

import { and, eq, inArray } from "drizzle-orm";
import { refresh } from "next/cache";
import { db } from "@/db";
import { medications, medLogs } from "@/db/schema";
import { istDate } from "@/lib/dates";
import type { MessageKey } from "@/lib/i18n";
import { requirePermission } from "@/lib/permissions";
import {
  doseSchema,
  medicationRefSchema,
  medicationsAddSchema,
  medicationsDeleteSchema,
  medicationUpdateSchema,
  toFieldErrors,
  type FormState,
} from "@/lib/validators";

export type MedicationInput = { name: string; dose: string; times: string[] };

/** Adds one or more medicines at once. Field errors come back as "<row>.<field>", e.g. "1.name". */
export async function addMedicationsAction(input: { patientId: string; meds: MedicationInput[] }): Promise<FormState> {
  const parsed = medicationsAddSchema.safeParse(input);
  if (!parsed.success) {
    const fieldErrors: Partial<Record<string, MessageKey>> = {};
    for (const issue of parsed.error.issues) {
      const [, row, field] = issue.path;
      const key = typeof row === "number" && field ? `${row}.${String(field)}` : "form";
      fieldErrors[key] ??= key === "form" ? "common.error" : (issue.message as MessageKey);
    }
    return { fieldErrors };
  }
  const { patientId, meds } = parsed.data;
  const { user } = await requirePermission(patientId, "manage_meds");

  await db.insert(medications).values(meds.map((m) => ({ patientId, loggedBy: user.id, ...m })));
  refresh();
  return { ok: true, values: { name: meds[0].name, count: String(meds.length) } };
}

export async function updateMedicationAction(
  input: MedicationInput & { patientId: string; medicationId: string }
): Promise<FormState> {
  const parsed = medicationUpdateSchema.safeParse(input);
  if (!parsed.success) return { fieldErrors: toFieldErrors(parsed.error) };
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

/** Deletes medicines for good, with their dose history (logs cascade). For ones added by mistake. */
export async function deleteMedicationsAction(input: { patientId: string; medicationIds: string[] }) {
  const parsed = medicationsDeleteSchema.safeParse(input);
  if (!parsed.success) return { ok: false };
  const { patientId, medicationIds } = parsed.data;
  await requirePermission(patientId, "manage_meds");

  await db
    .delete(medications)
    .where(and(inArray(medications.id, medicationIds), eq(medications.patientId, patientId)));
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
