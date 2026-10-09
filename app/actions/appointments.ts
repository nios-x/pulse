"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { appointments, doctors } from "@/db/schema";
import { runAction, type ActionResult } from "@/lib/action";
import { audit } from "@/lib/audit";
import { randomToken } from "@/lib/crypto";
import { ForbiddenError, getContext, requireCan } from "@/lib/context";
import { bookedSlots, nowIst } from "@/lib/data";
import { formatDateTime, fromIst } from "@/lib/dates";
import { firstName } from "@/lib/labels";
import { notify } from "@/lib/notify";
import { isBookable, slotsFor, type Slot } from "@/lib/slots";
import { appointmentSchema } from "@/lib/validators";

function meetingUrl(memberName: string) {
  return `https://meet.jit.si/pulse-${firstName(memberName).toLowerCase()}-${randomToken(9).replace(/[^a-zA-Z0-9]/g, "")}`;
}

/** Add or edit an appointment by hand (any doctor, any clinic). */
export async function saveAppointment(input: unknown): Promise<ActionResult<{ id: string }>> {
  return runAction(async () => {
    const ctx = await getContext();
    const data = appointmentSchema.parse(input);
    requireCan(ctx, "appointments.manage", data.memberId);
    const member = ctx.members.find((m) => m.id === data.memberId)!;
    const startsAt = fromIst(data.date, data.time);
    const values = {
      memberId: data.memberId,
      doctorName: data.doctorName,
      specialty: data.specialty,
      location: data.mode === "video" ? "Video consult" : data.location,
      startsAt,
      durationMin: data.durationMin,
      mode: data.mode,
      reason: data.reason,
      notes: data.notes,
    };
    if (data.id) {
      const [existing] = await db.select().from(appointments).where(eq(appointments.id, data.id)).limit(1);
      if (!existing) throw new ForbiddenError("That appointment no longer exists.");
      requireCan(ctx, "appointments.manage", existing.memberId);
      await db
        .update(appointments)
        .set({ ...values, meetingUrl: data.mode === "video" ? existing.meetingUrl ?? meetingUrl(member.name) : null })
        .where(eq(appointments.id, data.id));
      revalidatePath("/", "layout");
      return { ok: true, message: "Appointment updated", data: { id: data.id } };
    }
    const [row] = await db
      .insert(appointments)
      .values({ ...values, meetingUrl: data.mode === "video" ? meetingUrl(member.name) : null, createdBy: ctx.user.id })
      .returning({ id: appointments.id });
    await audit(ctx.family.id, ctx.user.id, "appointment.added", { member: member.name, doctor: data.doctorName });
    revalidatePath("/", "layout");
    return { ok: true, message: `Added: ${firstName(member.name)} with ${data.doctorName}, ${formatDateTime(startsAt)}`, data: { id: row.id } };
  });
}

const bookInput = z.object({
  doctorId: z.string().uuid(),
  memberId: z.string().uuid(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  time: z.string().regex(/^\d{2}:\d{2}$/),
  mode: z.enum(["in_person", "video"]),
  reason: z.string().trim().max(160).optional(),
});

/** Book a slot with a doctor from the directory. Video consults get a private meeting link. */
export async function bookAppointment(input: unknown): Promise<ActionResult<{ id: string; meetingUrl: string | null }>> {
  return runAction(async () => {
    const ctx = await getContext();
    const data = bookInput.parse(input);
    requireCan(ctx, "appointments.manage", data.memberId);
    const [doc] = await db.select().from(doctors).where(eq(doctors.id, data.doctorId)).limit(1);
    if (!doc) throw new ForbiddenError("That doctor isn't available.");
    if (data.mode === "video" && !doc.teleconsult) throw new ForbiddenError(`${doc.name} doesn't offer video consults.`);
    const booked = await bookedSlots(doc.id, data.date);
    if (!isBookable(doc.hours, doc.slotMinutes, data.date, data.time, booked, nowIst())) {
      return { ok: false, error: "Sorry, that slot was just taken or is no longer available. Please pick another time." };
    }
    const member = ctx.members.find((m) => m.id === data.memberId)!;
    const startsAt = fromIst(data.date, data.time);
    const url = data.mode === "video" ? meetingUrl(member.name) : null;
    const [row] = await db
      .insert(appointments)
      .values({
        memberId: member.id,
        doctorId: doc.id,
        doctorName: doc.name,
        specialty: doc.specialty,
        location: data.mode === "video" ? "Video consult" : `${doc.clinic}, ${doc.city}`,
        startsAt,
        durationMin: doc.slotMinutes,
        mode: data.mode,
        meetingUrl: url,
        reason: data.reason || null,
        createdBy: ctx.user.id,
      })
      .returning({ id: appointments.id });
    await audit(ctx.family.id, ctx.user.id, "appointment.booked", { member: member.name, doctor: doc.name, mode: data.mode });
    await notify({
      familyId: ctx.family.id,
      memberId: member.id,
      kind: "appointment",
      severity: "info",
      title: `Booked: ${firstName(member.name)} with ${doc.name}`,
      body: `${formatDateTime(startsAt)} · ${data.mode === "video" ? "Video consult" : doc.clinic} · Fee ₹${doc.fee}, pay at the clinic.`,
      href: "/appointments",
      dedupeKey: `booked-${row.id}`,
      email: {
        blocks: [
          { type: "status", tone: "success", label: "Appointment confirmed", text: `${member.name} with ${doc.name} (${doc.specialty})` },
          { type: "list", items: [
            { label: "When", meta: formatDateTime(startsAt) },
            { label: "Where", meta: data.mode === "video" ? "Video consult" : `${doc.clinic}, ${doc.city}` },
            { label: "Fee", meta: `₹${doc.fee}` },
          ] },
          ...(url ? [{ type: "button" as const, text: "Join video consult", href: url }] : []),
        ],
      },
    });
    revalidatePath("/", "layout");
    return { ok: true, message: `Booked ${doc.name} for ${firstName(member.name)} · ${formatDateTime(startsAt)}`, data: { id: row.id, meetingUrl: url } };
  });
}

export async function setAppointmentStatus(id: string, status: "scheduled" | "completed" | "cancelled"): Promise<ActionResult> {
  return runAction(async () => {
    const ctx = await getContext();
    const [appt] = await db.select().from(appointments).where(eq(appointments.id, id)).limit(1);
    if (!appt) throw new ForbiddenError("That appointment no longer exists.");
    requireCan(ctx, "appointments.manage", appt.memberId);
    await db.update(appointments).set({ status }).where(eq(appointments.id, id));
    await audit(ctx.family.id, ctx.user.id, `appointment.${status}`, { doctor: appt.doctorName });
    revalidatePath("/", "layout");
    return { ok: true, message: status === "cancelled" ? "Appointment cancelled" : status === "completed" ? "Marked as done" : "Appointment restored" };
  });
}

/** Free and taken slots for the booking screen. */
export async function getSlots(doctorId: string, date: string): Promise<Slot[]> {
  await getContext(); // signed-in family members only
  const [doc] = await db.select().from(doctors).where(eq(doctors.id, doctorId)).limit(1);
  if (!doc || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return [];
  return slotsFor(doc.hours, doc.slotMinutes, date, await bookedSlots(doctorId, date), nowIst());
}
