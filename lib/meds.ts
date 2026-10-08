import { and, asc, eq, gte } from "drizzle-orm";
import { db } from "@/db";
import { medications, medLogs } from "@/db/schema";

/** Active medicines plus dose logs from `fromDate` (India date) onwards. */
export async function loadMeds(patientId: string, fromDate: string) {
  const [meds, logs] = await Promise.all([
    db
      .select()
      .from(medications)
      .where(and(eq(medications.patientId, patientId), eq(medications.active, true)))
      .orderBy(asc(medications.createdAt)),
    db
      .select({ medicationId: medLogs.medicationId, date: medLogs.date, slot: medLogs.slot })
      .from(medLogs)
      .where(and(eq(medLogs.patientId, patientId), gte(medLogs.date, fromDate))),
  ]);
  return { meds, logs };
}
