"use server";

import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { doctors, members, users } from "@/db/schema";
import { createSession, hashPassword, verifyPassword } from "@/lib/auth";
import { acceptInvite } from "@/lib/invites";
import { z } from "zod";
import { inviteCode } from "@/lib/crypto";
import { signInSchema, signUpSchema } from "@/lib/validators";

export type AuthState = { error?: string; fieldErrors?: Record<string, string | undefined>; values?: Record<string, string> } | undefined;

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
  if (user.isDoctor) redirect("/doctor");
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

const doctorSignUp = signUpSchema.omit({ invite: true }).extend({
  specialty: z.string().trim().min(2, "Enter your speciality").max(80),
  clinic: z.string().trim().min(2, "Enter your clinic or hospital").max(120),
  city: z.string().trim().min(2, "Enter your city").max(60),
  registrationNo: z.string().trim().min(4, "Enter your medical council registration number").max(40),
  fee: z.coerce.number().int().min(0).max(20000),
  languages: z.string().trim().max(120).optional(),
  teleconsult: z.literal("on").optional(),
});

/** Doctors get their own account: a profile in the booking directory and the doctor portal. */
export async function signUpDoctorAction(_: AuthState, form: FormData): Promise<AuthState> {
  const raw = Object.fromEntries(form);
  const parsed = doctorSignUp.safeParse(raw);
  const values = Object.fromEntries(Object.entries(raw).filter(([k]) => k !== "password").map(([k, v]) => [k, String(v)]));
  if (!parsed.success) return { fieldErrors: fieldErrors(parsed.error.issues), values };
  const d = parsed.data;
  const passwordHash = await hashPassword(d.password);
  const name = /^dr\.?\s/i.test(d.name) ? d.name : `Dr. ${d.name}`;
  const userId = await db.transaction(async (tx) => {
    const [user] = await tx.insert(users).values({ name, email: d.email, passwordHash, consentAt: new Date(), isDoctor: true, dailyDigest: false }).onConflictDoNothing({ target: users.email }).returning({ id: users.id });
    if (!user) return null;
    await tx.insert(doctors).values({
      name,
      specialty: d.specialty,
      clinic: d.clinic,
      city: d.city,
      registrationNo: d.registrationNo,
      fee: d.fee,
      languages: (d.languages ?? "English").split(",").map((l) => l.trim()).filter(Boolean).slice(0, 8),
      teleconsult: d.teleconsult === "on",
      yearsExperience: 1,
      rating: 5,
      hours: { "0": null, "1": ["10:00", "13:00"], "2": ["10:00", "13:00"], "3": ["10:00", "13:00"], "4": ["10:00", "13:00"], "5": ["10:00", "13:00"], "6": ["10:00", "12:00"] },
      userId: user.id,
      connectCode: inviteCode(6),
    });
    return user.id;
  });
  if (!userId) return { fieldErrors: { email: "An account with this email already exists. Try signing in." }, values };
  await createSession(userId);
  redirect("/doctor?welcome=1");
}
