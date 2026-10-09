"use server";

import { revalidatePath } from "next/cache";
import { and, eq, gt, isNull } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { appointments, doctorAccess, doctorNotes, doctors, members } from "@/db/schema";
import { runAction, type ActionResult } from "@/lib/action";
import { audit } from "@/lib/audit";
import { ForbiddenError, getContext, requireCan } from "@/lib/context";
import { getDoctorContext, hasDoctorAccess } from "@/lib/doctor";
import { firstName } from "@/lib/labels";
import { notify } from "@/lib/notify";

// ---------- Doctor side ----------

const noteInput = z.object({
  memberId: z.string().uuid(),
  appointmentId: z.string().uuid().optional().nullable(),
  summary: z.string().trim().min(5, "Write a short summary of the visit").max(1500),
  advice: z.string().trim().max(1500).optional(),
  followUpOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).or(z.literal("")).optional(),
});

/** A doctor's visit note. Only for patients who currently share their data with this doctor. */
export async function saveDoctorNote(input: unknown): Promise<ActionResult> {
  return runAction(async () => {
    const { doctor } = await getDoctorContext();
    const data = noteInput.parse(input);
    if (!(await hasDoctorAccess(doctor.id, data.memberId))) throw new ForbiddenError("This patient's access has expired or was turned off by the family.");
    await db.insert(doctorNotes).values({ doctorId: doctor.id, memberId: data.memberId, appointmentId: data.appointmentId ?? null, summary: data.summary, advice: data.advice || null, followUpOn: data.followUpOn || null });
    if (data.appointmentId) {
      await db.update(appointments).set({ status: "completed" }).where(and(eq(appointments.id, data.appointmentId), eq(appointments.doctorId, doctor.id)));
    }
    const [member] = await db.select().from(members).where(eq(members.id, data.memberId)).limit(1);
    await audit(member.familyId, null, "doctor.note_added", { doctor: doctor.name, member: member.name });
    await notify({
      familyId: member.familyId,
      memberId: member.id,
      kind: "appointment",
      severity: "info",
      title: `${doctor.name} added a note for ${firstName(member.name)}`,
      body: data.advice ? `Advice: ${data.advice.slice(0, 160)}` : data.summary.slice(0, 160),
      href: `/members/${member.id}`,
      dedupeKey: `note-${doctor.id}-${member.id}-${Date.now()}`,
    });
    revalidatePath("/doctor", "layout");
    return { ok: true, message: "Note saved and shared with the family" };
  });
}

const hoursSchema = z.record(z.string(), z.tuple([z.string().regex(/^\d{2}:\d{2}$/), z.string().regex(/^\d{2}:\d{2}$/)]).nullable());

const profileInput = z.object({
  specialty: z.string().trim().min(2).max(80),
  clinic: z.string().trim().min(2).max(120),
  city: z.string().trim().min(2).max(60),
  phone: z.string().trim().max(20).optional(),
  fee: z.coerce.number().int().min(0).max(20000),
  languages: z.array(z.string().trim().min(2).max(30)).max(8),
  teleconsult: z.boolean(),
  slotMinutes: z.coerce.number().int().min(10).max(60),
  bio: z.string().trim().max(400).optional(),
  hours: hoursSchema,
});

export async function updateDoctorProfile(input: unknown): Promise<ActionResult> {
  return runAction(async () => {
    const { doctor } = await getDoctorContext();
    const data = profileInput.parse(input);
    for (const v of Object.values(data.hours)) if (v && v[0] >= v[1]) return { ok: false, error: "Each day's closing time must be after the opening time." };
    await db.update(doctors).set({ ...data, phone: data.phone || null, bio: data.bio || null }).where(eq(doctors.id, doctor.id));
    revalidatePath("/doctor", "layout");
    return { ok: true, message: "Profile and hours saved. Families see the new slots right away." };
  });
}

export async function completeAppointmentAsDoctor(id: string): Promise<ActionResult> {
  return runAction(async () => {
    const { doctor } = await getDoctorContext();
    const res = await db.update(appointments).set({ status: "completed" }).where(and(eq(appointments.id, id), eq(appointments.doctorId, doctor.id))).returning({ id: appointments.id });
    if (!res.length) throw new ForbiddenError("That appointment isn't yours.");
    revalidatePath("/doctor", "layout");
    return { ok: true, message: "Marked as seen" };
  });
}

// ---------- Family side ----------

const connectInput = z.object({
  code: z.string().trim().toUpperCase().regex(/^[A-Z0-9]{6,8}$/, "Enter the 6-letter code your doctor gave you"),
  memberId: z.string().uuid(),
  days: z.coerce.number().int().min(1).max(365),
  consent: z.literal("on", { message: "Please confirm consent to share" }),
});

/** The family connects a doctor with the doctor's code, for one member and a limited time. */
export async function connectDoctor(input: unknown): Promise<ActionResult<{ doctor: string }>> {
  return runAction(async () => {
    const ctx = await getContext();
    const data = connectInput.parse(input);
    requireCan(ctx, "sharing.manage", data.memberId);
    const [doc] = await db.select().from(doctors).where(eq(doctors.connectCode, data.code)).limit(1);
    if (!doc || !doc.userId) return { ok: false, error: "No doctor found with that code. Check it with your doctor.", fieldErrors: { code: "Not found" } };
    await db.insert(doctorAccess).values({ doctorId: doc.id, familyId: ctx.family.id, memberId: data.memberId, reason: "connected", grantedBy: ctx.user.id, expiresAt: new Date(Date.now() + data.days * 86_400_000) });
    const member = ctx.members.find((m) => m.id === data.memberId)!;
    await audit(ctx.family.id, ctx.user.id, "doctor.connected", { doctor: doc.name, member: member.name, days: data.days, consent: true });
    revalidatePath("/settings");
    return { ok: true, message: `${doc.name} can now see ${firstName(member.name)}'s health summary for ${data.days} days`, data: { doctor: doc.name } };
  });
}

export async function revokeDoctorAccess(id: string): Promise<ActionResult> {
  return runAction(async () => {
    const ctx = await getContext();
    const [row] = await db.select().from(doctorAccess).where(eq(doctorAccess.id, id)).limit(1);
    if (!row || row.familyId !== ctx.family.id) throw new ForbiddenError("That connection doesn't exist.");
    requireCan(ctx, "sharing.manage", row.memberId);
    // Revoke every live grant this doctor has for the member
    await db
      .update(doctorAccess)
      .set({ revokedAt: new Date() })
      .where(and(eq(doctorAccess.doctorId, row.doctorId), eq(doctorAccess.memberId, row.memberId), isNull(doctorAccess.revokedAt), gt(doctorAccess.expiresAt, new Date())));
    await audit(ctx.family.id, ctx.user.id, "doctor.revoked", { memberId: row.memberId });
    revalidatePath("/settings");
    return { ok: true, message: "Access removed. The doctor can no longer see this profile." };
  });
}
