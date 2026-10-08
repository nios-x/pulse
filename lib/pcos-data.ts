import { and, desc, eq, gte, lte } from "drizzle-orm";
import { db } from "@/db";
import {
  cycleLogs,
  graceDays,
  memberships,
  patients,
  pcosDailyActions,
  pcosFoodLogs,
  pcosPrescriptions,
  pcosProfiles,
  symptomLogs,
  type CycleLog,
  type GraceDay,
  type Patient,
  type PcosDailyAction,
  type PcosFoodLog,
  type PcosPrescription,
  type PcosProfile,
  type SymptomLog,
} from "@/db/schema";
import { istDate } from "@/lib/dates";
import { now } from "@/lib/now";

export type PcosPatientSummary = {
  patient: Patient;
  prescription: PcosPrescription | null;
  profile: PcosProfile | null;
};

/**
 * Finds or returns the PCOS patient for the user, plus their prescription and profile.
 */
export async function getPcosPatientSummary(
  userId: string,
  preferredPatientId?: string | null
): Promise<PcosPatientSummary | null> {
  const query = db
    .select({
      patient: patients,
      membership: memberships,
    })
    .from(memberships)
    .innerJoin(patients, eq(memberships.patientId, patients.id))
    .where(and(eq(memberships.userId, userId), eq(patients.condition, "pcos")));

  const rows = await query;
  if (!rows.length) return null;

  const target = preferredPatientId
    ? rows.find((r) => r.patient.id === preferredPatientId)?.patient ?? rows[0].patient
    : rows[0].patient;

  const [prescription] = await db
    .select()
    .from(pcosPrescriptions)
    .where(eq(pcosPrescriptions.patientId, target.id))
    .orderBy(desc(pcosPrescriptions.createdAt))
    .limit(1);

  const [profile] = await db
    .select()
    .from(pcosProfiles)
    .where(eq(pcosProfiles.patientId, target.id))
    .limit(1);

  return {
    patient: target,
    prescription: prescription ?? null,
    profile: profile ?? null,
  };
}

/**
 * Loads today's daily actions for the PCOS patient.
 */
export async function getPcosTodayData(patientId: string) {
  const current = await now();
  const today = istDate(current);

  const [todayActions, [todayGraceDay]] = await Promise.all([
    db
      .select()
      .from(pcosDailyActions)
      .where(and(eq(pcosDailyActions.patientId, patientId), eq(pcosDailyActions.date, today))),
    db
      .select()
      .from(graceDays)
      .where(and(eq(graceDays.patientId, patientId), eq(graceDays.date, today)))
      .limit(1),
  ]);

  return {
    today,
    todayActions,
    todayGraceDay: todayGraceDay ?? null,
  };
}

/**
 * Loads recent symptoms (last 30 days).
 */
export async function getRecentSymptoms(patientId: string, limit = 50): Promise<SymptomLog[]> {
  return db
    .select()
    .from(symptomLogs)
    .where(eq(symptomLogs.patientId, patientId))
    .orderBy(desc(symptomLogs.date), desc(symptomLogs.createdAt))
    .limit(limit);
}

/**
 * Loads recent cycle logs.
 */
export async function getRecentCycles(patientId: string, limit = 10): Promise<CycleLog[]> {
  return db
    .select()
    .from(cycleLogs)
    .where(eq(cycleLogs.patientId, patientId))
    .orderBy(desc(cycleLogs.startDate))
    .limit(limit);
}

/**
 * Loads recent food pairing logs (last 7 days).
 */
export async function getRecentPcosFoods(patientId: string, limit = 30): Promise<PcosFoodLog[]> {
  return db
    .select()
    .from(pcosFoodLogs)
    .where(eq(pcosFoodLogs.patientId, patientId))
    .orderBy(desc(pcosFoodLogs.date), desc(pcosFoodLogs.createdAt))
    .limit(limit);
}
