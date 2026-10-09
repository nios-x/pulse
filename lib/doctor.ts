import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { and, desc, eq, gt, isNull } from "drizzle-orm";
import { db } from "@/db";
import { doctorAccess, doctors, families, members } from "@/db/schema";
import { requireUser } from "@/lib/auth";

/** The signed-in doctor. Family users are sent to their dashboard. */
export const getDoctorContext = cache(async () => {
  const user = await requireUser();
  if (!user.isDoctor) redirect("/dashboard");
  const [doctor] = await db.select().from(doctors).where(eq(doctors.userId, user.id)).limit(1);
  if (!doctor) redirect("/sign-in");
  return { user, doctor };
});

/** Patients who currently share their data with this doctor. */
export async function doctorPatients(doctorId: string) {
  const rows = await db
    .select({ access: doctorAccess, member: members, familyName: families.name })
    .from(doctorAccess)
    .innerJoin(members, eq(doctorAccess.memberId, members.id))
    .innerJoin(families, eq(doctorAccess.familyId, families.id))
    .where(and(eq(doctorAccess.doctorId, doctorId), isNull(doctorAccess.revokedAt), gt(doctorAccess.expiresAt, new Date())))
    .orderBy(desc(doctorAccess.createdAt));
  // One row per member (keep the longest-lasting grant)
  const byMember = new Map<string, (typeof rows)[number]>();
  for (const r of rows) {
    const prev = byMember.get(r.member.id);
    if (!prev || prev.access.expiresAt < r.access.expiresAt) byMember.set(r.member.id, r);
  }
  return [...byMember.values()];
}

export async function hasDoctorAccess(doctorId: string, memberId: string): Promise<boolean> {
  const [row] = await db
    .select({ id: doctorAccess.id })
    .from(doctorAccess)
    .where(and(eq(doctorAccess.doctorId, doctorId), eq(doctorAccess.memberId, memberId), isNull(doctorAccess.revokedAt), gt(doctorAccess.expiresAt, new Date())))
    .limit(1);
  return Boolean(row);
}
