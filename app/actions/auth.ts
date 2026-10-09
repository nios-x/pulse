"use server";

import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { members, users } from "@/db/schema";
import { createSession, hashPassword, verifyPassword } from "@/lib/auth";
import { acceptInvite } from "@/lib/invites";
import { signInSchema, signUpSchema } from "@/lib/validators";

export type AuthState = { error?: string; fieldErrors?: Record<string, string>; values?: Record<string, string> } | undefined;

function safeNext(next: FormDataEntryValue | null): string {
  const v = typeof next === "string" ? next : "";
  return v.startsWith("/") && !v.startsWith("//") ? v : "/dashboard";
}

function fieldErrors(issues: { path: PropertyKey[]; message: string }[]) {
  const out: Record<string, string> = {};
  for (const i of issues) {
    const k = String(i.path[0] ?? "");
    if (k && !out[k]) out[k] = i.message;
  }
  return out;
}

export async function signInAction(_: AuthState, form: FormData): Promise<AuthState> {
  const parsed = signInSchema.safeParse(Object.fromEntries(form));
  const values = { email: String(form.get("email") ?? "") };
  if (!parsed.success) return { fieldErrors: fieldErrors(parsed.error.issues), values };
  const [user] = await db.select().from(users).where(eq(users.email, parsed.data.email)).limit(1);
  // Same message either way, so the form doesn't reveal which emails exist
  if (!user || !(await verifyPassword(parsed.data.password, user.passwordHash))) {
    return { error: "That email and password don't match. Please try again.", values };
  }
  await createSession(user.id);
  const [m] = await db.select({ id: members.id }).from(members).where(eq(members.userId, user.id)).limit(1);
  redirect(m ? safeNext(form.get("next")) : "/onboarding");
}

export async function signUpAction(_: AuthState, form: FormData): Promise<AuthState> {
  const parsed = signUpSchema.safeParse(Object.fromEntries(form));
  const values = { name: String(form.get("name") ?? ""), email: String(form.get("email") ?? ""), invite: String(form.get("invite") ?? "") };
  if (!parsed.success) return { fieldErrors: fieldErrors(parsed.error.issues), values };
  const { name, email, password, invite } = parsed.data;
  const passwordHash = await hashPassword(password);
  const [user] = await db
    .insert(users)
    .values({ name, email, passwordHash, consentAt: new Date() })
    .onConflictDoNothing({ target: users.email })
    .returning({ id: users.id });
  if (!user) return { fieldErrors: { email: "An account with this email already exists. Try signing in." }, values };
  await createSession(user.id);
  if (invite) {
    const joined = await acceptInvite(invite, { id: user.id, name, email });
    if (joined.ok) redirect("/dashboard?welcome=1");
  }
  redirect("/onboarding");
}
