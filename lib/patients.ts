import { asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { memberships, patients } from "@/db/schema";

/** Every patient the user belongs to, oldest membership first. */
export async function listMyPatients(userId: string) {
  return db
    .select({ id: patients.id, name: patients.name, role: memberships.role })
    .from(memberships)
    .innerJoin(patients, eq(memberships.patientId, patients.id))
    .where(eq(memberships.userId, userId))
    .orderBy(asc(memberships.createdAt));
}
