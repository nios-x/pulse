"use server";

import { and, eq, inArray, ne } from "drizzle-orm";
import { refresh } from "next/cache";
import { db } from "@/db";
import { callBookings, memberships, users } from "@/db/schema";
import { scheduleProblem } from "@/lib/bookings";
import { istDate, istDateTime } from "@/lib/dates";
import { formatDay, formatTime } from "@/lib/format";
import { createT } from "@/lib/i18n";
import { requirePermission } from "@/lib/permissions";
import { pushToUsers } from "@/lib/push";
import {
  bookCallSchema,
  bookingRefSchema,
  readForm,
  respondBookingSchema,
  toFieldErrors,
  type FormState,
} from "@/lib/validators";

const whenText = (d: Date, locale: "en" | "hi") => `${formatDay(istDate(d), locale)}, ${formatTime(d, locale)}`;

/** The family head (or the patient) books a call with the doctor for a member. */
export async function bookCallAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const raw = readForm(formData, ["patientId", "doctorId", "memberId", "when", "reason"]);
  const parsed = bookCallSchema.safeParse(raw);
  if (!parsed.success) return { fieldErrors: toFieldErrors(parsed.error), values: raw };
  const { patientId, doctorId, memberId, when, reason } = parsed.data;
  const { user, patient } = await requirePermission(patientId, "book_call");

  // The doctor must be this patient's doctor; the member must be in the family (not a doctor).
  const team = await db
    .select({ userId: memberships.userId, role: memberships.role, name: users.name })
    .from(memberships)
    .innerJoin(users, eq(memberships.userId, users.id))
    .where(and(eq(memberships.patientId, patientId), inArray(memberships.userId, [doctorId, memberId])));
  if (!team.some((m) => m.userId === doctorId && m.role === "doctor")) {
    return { fieldErrors: { doctorId: "booking.error.doctor" }, values: raw };
  }
  if (!team.some((m) => m.userId === memberId && m.role !== "doctor")) {
    return { fieldErrors: { memberId: "booking.error.member" }, values: raw };
  }

  const scheduledAt = istDateTime(when.slice(0, 10), when.slice(11, 16));
  const problem = scheduleProblem(scheduledAt, new Date());
  if (problem) return { fieldErrors: { when: problem === "past" ? "booking.error.past" : "booking.error.tooFar" }, values: raw };

  await db.insert(callBookings).values({ patientId, doctorId, memberId, bookedBy: user.id, scheduledAt, reason });

  const memberName = team.find((m) => m.userId === memberId)!.name;
  await pushToUsers([doctorId], (locale) => {
    const t = createT(locale);
    return {
      title: t("push.bookingTitle", { name: memberName }),
      body: t("push.bookingBody", { when: whenText(scheduledAt, locale), patient: patient.name }),
      url: `/p/${patientId}/doctor`,
      tag: `booking-${patientId}-${scheduledAt.getTime()}`,
    };
  });
  refresh();
  return { ok: true, values: { when: whenText(scheduledAt, "en") } };
}

/** The doctor accepts or declines a requested call. */
export async function respondBookingAction(input: { patientId: string; bookingId: string; accept: boolean }) {
  const parsed = respondBookingSchema.safeParse(input);
  if (!parsed.success) return { ok: false };
  const { patientId, bookingId, accept } = parsed.data;
  const { user } = await requirePermission(patientId, "answer_booking");

  const [booking] = await db
    .update(callBookings)
    .set({ status: accept ? "accepted" : "declined", respondedAt: new Date() })
    .where(
      and(
        eq(callBookings.id, bookingId),
        eq(callBookings.patientId, patientId),
        eq(callBookings.doctorId, user.id),
        eq(callBookings.status, "requested")
      )
    )
    .returning();
  if (!booking) return { ok: false };

  const notify = [...new Set([booking.memberId, booking.bookedBy].filter((id): id is string => Boolean(id)))];
  await pushToUsers(notify, (locale) => {
    const t = createT(locale);
    return {
      title: t(accept ? "push.bookingAccepted" : "push.bookingDeclined", { name: user.name }),
      body: whenText(booking.scheduledAt, locale),
      url: `/p/${patientId}/doctor`,
      tag: `booking-${booking.id}`,
    };
  });
  refresh();
  return { ok: true };
}

/** Cancel a booked call: only the family side that books calls. The doctor declines instead. */
export async function cancelBookingAction(input: { patientId: string; bookingId: string }) {
  const parsed = bookingRefSchema.safeParse(input);
  if (!parsed.success) return { ok: false };
  const { patientId, bookingId } = parsed.data;
  await requirePermission(patientId, "book_call");

  await db
    .update(callBookings)
    .set({ status: "cancelled", respondedAt: new Date() })
    .where(
      and(
        eq(callBookings.id, bookingId),
        eq(callBookings.patientId, patientId),
        ne(callBookings.status, "declined"),
        ne(callBookings.status, "cancelled")
      )
    );
  refresh();
  return { ok: true };
}
