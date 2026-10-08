"use server";

import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { users } from "@/db/schema";
import { createSession, hashPassword, signOut, verifyPassword } from "@/lib/auth";
import {
  nextPathSchema,
  readForm,
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
  redirect(nextPathSchema.parse(raw.next));
}

export async function signUpAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const raw = readForm(formData, ["name", "email", "password", "phone", "next"]);
  const values = { name: raw.name, email: raw.email, phone: raw.phone };
  const parsed = signUpSchema.safeParse(raw);
  if (!parsed.success) return { fieldErrors: toFieldErrors(parsed.error), values };

  const { name, email, password, phone } = parsed.data;
  const [existing] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, email))
    .limit(1);
  if (existing) return { fieldErrors: { email: "auth.error.taken" }, values };

  const [user] = await db
    .insert(users)
    .values({ name, email, phone, passwordHash: await hashPassword(password) })
    .onConflictDoNothing({ target: users.email })
    .returning({ id: users.id });
  if (!user) return { fieldErrors: { email: "auth.error.taken" }, values };

  await createSession(user.id);
  redirect(nextPathSchema.parse(raw.next));
}

export async function signOutAction() {
  await signOut();
  redirect("/auth");
}
