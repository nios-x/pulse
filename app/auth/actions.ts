"use server";

import { eq, TransactionRollbackError } from "drizzle-orm";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { memberships, patients, users } from "@/db/schema";
import { audit } from "@/lib/audit";
import { createSession, createUser, signOut, verifyPassword } from "@/lib/auth";
import type { MessageKey } from "@/lib/i18n";
import { findActiveInvite, redeemInvite } from "@/lib/join";
import { defaultScopes } from "@/lib/permissions";
import {
  inviteCodeSchema,
  nextPathSchema,
  readForm,
  resetPasswordSchema,
  signInSchema,
  signUpSchema,
  toFieldErrors,
  type FormState,
} from "@/lib/validators";

export async function signInAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const raw = readForm(formData, ["email", "password", "next"]);
  const values = { email: raw.email };
  const parsed = signInSchema.safeParse(raw);
  if (!parsed.success) return { fieldErrors: toFieldErrors(parsed.error), values };

  const [user] = await db
    .select({ id: users.id, passwordHash: users.passwordHash })
    .from(users)
    .where(eq(users.email, parsed.data.email))
    .limit(1);

  // One generic message, so the form never reveals which emails have accounts.
  if (!user || !(await verifyPassword(parsed.data.password, user.passwordHash))) {
    return { error: "auth.error.invalid", values };
  }

  await createSession(user.id);
  const destination = !raw.next || raw.next === "/home" ? "/select-condition" : nextPathSchema.parse(raw.next);
  redirect(destination);
}

/**
 * Creates the account. With an invite code, the user joins that care team in the same
 * transaction (the invite decides the role). Without one, a doctor gets an account that
 * serves families and nothing else; anyone else gets their own health profile as its owner.
 */
export async function signUpAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const raw = readForm(formData, ["name", "email", "password", "phone", "code", "accountType", "clinic"]);
  const values = { name: raw.name, email: raw.email, phone: raw.phone, accountType: raw.accountType, clinic: raw.clinic };
  const code = raw.code ? inviteCodeSchema.safeParse(raw.code) : null;
  if (code && !code.success) return { error: "join.error.invalid", values };
  const parsed = signUpSchema.safeParse(raw);
  if (!parsed.success) return { fieldErrors: toFieldErrors(parsed.error), values };

  if (!code && parsed.data.accountType === "doctor") {
    // A doctor has no health profile; families add them to their care circle by invite.
    const userId = await createUser({ ...parsed.data, isDoctor: true }, db);
    if (!userId) return { fieldErrors: { email: "auth.error.taken" }, values };
    await audit({ actorUserId: userId, patientId: null, action: "doctor_signed_up", detail: {} });
    await createSession(userId);
    redirect("/home");
  }

  if (!code) {
    // No invite: the account comes with the person's own health profile, which they own.
    // Profiles are only ever made here, for yourself; others join a family by invite.
    const own = await db.transaction(async (tx) => {
      const userId = await createUser(parsed.data, tx);
      if (!userId) return null;
      const [patient] = await tx
        .insert(patients)
        .values({ name: parsed.data.name, createdBy: userId })
        .returning({ id: patients.id });
      await tx
        .insert(memberships)
        .values({ patientId: patient.id, userId, role: "owner", scopes: defaultScopes("owner") });
      await audit(
        { actorUserId: userId, patientId: patient.id, action: "patient_created", detail: { role: "owner" } },
        tx
      );
      return { userId, patientId: patient.id };
    });
    if (!own) return { fieldErrors: { email: "auth.error.taken" }, values };
    await createSession(own.userId);
    redirect(`/home?p=${own.patientId}`);
  }

  await createSession(user.id);
  const destination = !raw.next || raw.next === "/home" ? "/select-condition" : nextPathSchema.parse(raw.next);
  redirect(destination);
}

export async function resetPasswordAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const raw = readForm(formData, ["email", "password", "confirmPassword", "next"]);
  const values = { email: raw.email };
  const parsed = resetPasswordSchema.safeParse(raw);
  if (!parsed.success) return { fieldErrors: toFieldErrors(parsed.error), values };

  const { email, password } = parsed.data;
  const [user] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

  if (!user) {
    return { error: "auth.error.userNotFound", values };
  }

  const passwordHash = await hashPassword(password);
  await db
    .update(users)
    .set({ passwordHash })
    .where(eq(users.id, user.id));

  await createSession(user.id);
  const destination = !raw.next || raw.next === "/home" ? "/select-condition" : nextPathSchema.parse(raw.next);
  redirect(destination);
}

export async function signOutAction() {
  await signOut();
  redirect("/auth");
}
