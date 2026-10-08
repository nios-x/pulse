"use server";

import { redirect } from "next/navigation";
import { db } from "@/db";
import { memberships, patients } from "@/db/schema";
import { audit } from "@/lib/audit";
import { requireUser } from "@/lib/auth";
import { defaultScopes } from "@/lib/permissions";
import { createPatientSchema, readForm, toFieldErrors, type FormState } from "@/lib/validators";

export async function createPatientAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser();
  const raw = readForm(formData, ["name", "forWhom", "birthYear", "city"]);
  const parsed = createPatientSchema.safeParse(raw);
  if (!parsed.success) return { fieldErrors: toFieldErrors(parsed.error), values: raw };

  const { name, forWhom, birthYear, city } = parsed.data;
  // A profile for yourself makes you the owner. A profile for someone else makes
  // you their caregiver; they join later as owner through an invite.
  const role = forWhom === "me" ? "owner" : "caregiver";

  const patientId = await db.transaction(async (tx) => {
    const [patient] = await tx
      .insert(patients)
      .values({ name, birthYear, city, createdBy: user.id })
      .returning({ id: patients.id });
    await tx
      .insert(memberships)
      .values({ patientId: patient.id, userId: user.id, role, scopes: defaultScopes(role) });
    await audit(
      { actorUserId: user.id, patientId: patient.id, action: "patient_created", detail: { role } },
      tx
    );
    return patient.id;
  });

  redirect(forWhom === "me" ? `/home?p=${patientId}` : `/p/${patientId}/meds`);
}
