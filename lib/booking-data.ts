import { and, asc, desc, eq, gte, inArray } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { db } from "@/db";
import { callBookings, memberships, patients, users } from "@/db/schema";

/** Everyone in the care team, split into doctors and family (patient included). */
export async function careTeam(patientId: string) {
  const rows = await db
    .select({ id: users.id, name: users.name, role: memberships.role })
    .from(memberships)
    .innerJoin(users, eq(memberships.userId, users.id))
    .where(eq(memberships.patientId, patientId))
    .orderBy(asc(memberships.createdAt));
  return {
    doctors: rows.filter((r) => r.role === "doctor"),
    family: rows.filter((r) => r.role !== "doctor"),
  };
}

/** Bookings for one patient, newest scheduled first, with names. */
export async function listBookings(patientId: string, limit = 30) {
  const doctor = alias(users, "doctor");
  const member = alias(users, "member");
  const booker = alias(users, "booker");
  return db
    .select({
      id: callBookings.id,
      scheduledAt: callBookings.scheduledAt,
      status: callBookings.status,
      reason: callBookings.reason,
      doctorId: callBookings.doctorId,
      doctorName: doctor.name,
      memberId: callBookings.memberId,
      memberName: member.name,
      bookedBy: callBookings.bookedBy,
      bookedByName: booker.name,
    })
    .from(callBookings)
    .innerJoin(doctor, eq(callBookings.doctorId, doctor.id))
    .innerJoin(member, eq(callBookings.memberId, member.id))
    .leftJoin(booker, eq(callBookings.bookedBy, booker.id))
    .where(eq(callBookings.patientId, patientId))
    .orderBy(desc(callBookings.scheduledAt))
    .limit(limit);
}

/** The next open booking (waiting or confirmed) from an hour ago onwards, for the home card. */
export async function nextBooking(patientId: string, since: Date) {
  const doctor = alias(users, "doctor");
  const member = alias(users, "member");
  const [row] = await db
    .select({
      scheduledAt: callBookings.scheduledAt,
      status: callBookings.status,
      doctorName: doctor.name,
      memberName: member.name,
    })
    .from(callBookings)
    .innerJoin(doctor, eq(callBookings.doctorId, doctor.id))
    .innerJoin(member, eq(callBookings.memberId, member.id))
    .where(
      and(
        eq(callBookings.patientId, patientId),
        inArray(callBookings.status, ["requested", "accepted"]),
        gte(callBookings.scheduledAt, since)
      )
    )
    .orderBy(asc(callBookings.scheduledAt))
    .limit(1);
  return row ?? null;
}

/** This doctor's open calls (waiting for an answer or confirmed) from `since` on, soonest first. */
export async function callsForDoctor(doctorId: string, since: Date) {
  const member = alias(users, "member");
  return db
    .select({
      id: callBookings.id,
      patientId: callBookings.patientId,
      patientName: patients.name,
      memberId: callBookings.memberId,
      memberName: member.name,
      scheduledAt: callBookings.scheduledAt,
      status: callBookings.status,
      reason: callBookings.reason,
    })
    .from(callBookings)
    .innerJoin(patients, eq(callBookings.patientId, patients.id))
    .innerJoin(member, eq(callBookings.memberId, member.id))
    .where(
      and(
        eq(callBookings.doctorId, doctorId),
        inArray(callBookings.status, ["requested", "accepted"]),
        gte(callBookings.scheduledAt, since)
      )
    )
    .orderBy(asc(callBookings.scheduledAt))
    .limit(20);
}
