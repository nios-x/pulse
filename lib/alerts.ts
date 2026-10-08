import { and, desc, eq, inArray, isNotNull, isNull, max, ne, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  alerts,
  dailyCheckins,
  glucoseReadings,
  meals,
  medLogs,
  memberships,
  users,
  type Role,
} from "@/db/schema";
import type { AlertKind } from "@/lib/safety";

// Family members never see support requests; those go to the caregivers.
const kindsFor = (role: Role) => (role === "family" ? ne(alerts.kind, "support_request") : undefined);

/** Unacknowledged alerts for the bell. Caller must hold receive_alerts. */
export async function countUnread(patientId: string, role: Role): Promise<number> {
  const [row] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(alerts)
    .where(and(eq(alerts.patientId, patientId), isNull(alerts.ackAt), kindsFor(role)));
  return row?.n ?? 0;
}

export async function listAlerts(patientId: string, role: Role, limit = 50) {
  return db
    .select({
      id: alerts.id,
      kind: alerts.kind,
      severity: alerts.severity,
      createdAt: alerts.createdAt,
      ackAt: alerts.ackAt,
      ackByName: sql<string | null>`(select name from ${users} where ${users.id} = ${alerts.ackBy})`,
      loggedByName: sql<string | null>`(select name from ${users} where ${users.id} = ${alerts.loggedBy})`,
      mgdl: glucoseReadings.mgdl,
    })
    .from(alerts)
    .leftJoin(glucoseReadings, eq(alerts.sourceId, glucoseReadings.id))
    .where(and(eq(alerts.patientId, patientId), kindsFor(role)))
    .orderBy(desc(alerts.createdAt))
    .limit(limit);
}

export async function createAlert(input: {
  patientId: string;
  loggedBy: string;
  kind: AlertKind;
  severity: "warning" | "urgent";
  sourceId?: string;
}) {
  await db.insert(alerts).values(input);
}

/** People the logger can call from an alert: the patient, caregivers and the doctor, if they have a phone number. */
export async function callableMembers(patientId: string, excludeUserId: string) {
  return db
    .select({ userId: users.id, name: users.name, phone: users.phone, role: memberships.role })
    .from(memberships)
    .innerJoin(users, eq(memberships.userId, users.id))
    .where(
      and(
        eq(memberships.patientId, patientId),
        inArray(memberships.role, ["owner", "caregiver", "doctor"]),
        ne(users.id, excludeUserId),
        isNotNull(users.phone)
      )
    );
}

/** Time of the most recent log of any kind. */
export async function lastLogAt(patientId: string): Promise<Date | null> {
  const rows = await Promise.all([
    db.select({ at: max(glucoseReadings.measuredAt) }).from(glucoseReadings).where(eq(glucoseReadings.patientId, patientId)),
    db.select({ at: max(meals.eatenAt) }).from(meals).where(eq(meals.patientId, patientId)),
    db.select({ at: max(medLogs.takenAt) }).from(medLogs).where(eq(medLogs.patientId, patientId)),
    db.select({ at: max(dailyCheckins.createdAt) }).from(dailyCheckins).where(eq(dailyCheckins.patientId, patientId)),
  ]);
  // max() can come back as a string from the driver; normalise to Date.
  const times = rows
    .map(([r]) => (r?.at ? new Date(r.at) : null))
    .filter((d): d is Date => d !== null && !Number.isNaN(d.getTime()));
  return times.length ? new Date(Math.max(...times.map((d) => d.getTime()))) : null;
}
