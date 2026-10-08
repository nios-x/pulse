"use server";

import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { refresh } from "next/cache";
import { db } from "@/db";
import { patients } from "@/db/schema";
import { audit } from "@/lib/audit";
import { requirePermission } from "@/lib/permissions";
import { deletePatientSchema, limitsSchema, readForm, toFieldErrors, type FormState } from "@/lib/validators";

/** glucoseLow / glucoseHigh, changed on the doctor's instruction. Urgent limits (54, 400) stay fixed. */
export async function updateLimitsAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const raw = readForm(formData, ["patientId", "glucoseLow", "glucoseHigh"]);
  const parsed = limitsSchema.safeParse(raw);
  if (!parsed.success) return { fieldErrors: toFieldErrors(parsed.error), values: raw };
  const { patientId, glucoseLow, glucoseHigh } = parsed.data;
  await requirePermission(patientId, "edit_patient");
  await db.update(patients).set({ glucoseLow, glucoseHigh }).where(eq(patients.id, patientId));
  refresh();
  return { ok: true, values: raw };
}

/** Owner only. Logged to audit_log first, then the patient and every row cascade away. */
export async function deletePatientAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = deletePatientSchema.safeParse(readForm(formData, ["patientId", "confirmName"]));
  if (!parsed.success) return { error: "common.error" };
  const { patientId, confirmName } = parsed.data;
  const { user, patient } = await requirePermission(patientId, "delete_patient");
  if (confirmName.toLowerCase() !== patient.name.trim().toLowerCase()) {
    return { fieldErrors: { confirmName: "settings.error.confirm" } };
  }

  await audit({
    actorUserId: user.id,
    patientId,
    action: "patient_deleted",
    detail: { name: patient.name, createdAt: patient.createdAt.toISOString() },
  });
  await db.delete(patients).where(eq(patients.id, patientId));
  redirect("/home");
}
