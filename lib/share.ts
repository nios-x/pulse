import { and, desc, eq, gte, ne, sql } from "drizzle-orm";
import { db } from "@/db";
import { alerts, labResults, moodChecks, patients, shareLinks } from "@/db/schema";
import { adherence } from "@/lib/adherence";
import { addDays, istDate, istDateTime, istMinutes } from "@/lib/dates";
import {
  fastingSeries,
  fastingTrend,
  mealEffect,
  medicineEffect,
  walkEffect,
  type Insight,
} from "@/lib/insights";
import { loadInsightInputs } from "@/lib/insights-data";
import { shareTokenSchema } from "@/lib/validators";

export const SUMMARY_DAYS = 90;

/**
 * Everything the doctor sees, or null when the link is unknown, expired or
 * revoked. No login: the token is the only key.
 */
export async function loadShareSummary(rawToken: string, now: Date) {
  const token = shareTokenSchema.safeParse(rawToken);
  if (!token.success) return null;

  const [row] = await db
    .select({ link: shareLinks, patient: patients })
    .from(shareLinks)
    .innerJoin(patients, eq(shareLinks.patientId, patients.id))
    .where(eq(shareLinks.token, token.data))
    .limit(1);
  if (!row || row.link.revokedAt || row.link.expiresAt <= now) return null;

  const { patient, link } = row;
  const clock = { today: istDate(now), nowMinutes: istMinutes(now) };
  const data = await loadInsightInputs(patient.id, clock, SUMMARY_DAYS);
  const since = istDateTime(data.from);
  const readings = data.readings.filter((r) => r.measuredAt >= since);
  const fasting = readings.filter((r) => r.context === "fasting").map((r) => r.mgdl);
  const inRange = readings.filter((r) => r.mgdl >= patient.glucoseLow && r.mgdl < patient.glucoseHigh).length;

  // Top insights use the last 30 days, like the patient's own insights page.
  const since30 = istDateTime(addDays(clock.today, -29));
  const r30 = data.readings.filter((r) => r.measuredAt >= since30);
  const m30 = data.meals.filter((m) => m.eatenAt >= since30);
  const insights = [
    mealEffect(r30, m30),
    medicineEffect(r30, data.weeks.slice(0, 4)),
    walkEffect(r30, data.checkins.filter((c) => c.date >= addDays(clock.today, -30))),
    fastingTrend(r30, clock.today),
  ]
    .filter((i): i is Insight => i !== null)
    .slice(0, 2);

  const [labs, alertCounts, mood] = await Promise.all([
    db
      .select({ value: labResults.value, takenOn: labResults.takenOn })
      .from(labResults)
      .where(and(eq(labResults.patientId, patient.id), eq(labResults.kind, "hba1c")))
      .orderBy(desc(labResults.takenOn))
      .limit(4),
    db
      .select({ severity: alerts.severity, n: sql<number>`count(*)::int` })
      .from(alerts)
      .where(and(eq(alerts.patientId, patient.id), gte(alerts.createdAt, since), ne(alerts.kind, "support_request")))
      .groupBy(alerts.severity),
    link.includeMood
      ? db
          .select({ score: moodChecks.score, checkedAt: moodChecks.checkedAt })
          .from(moodChecks)
          .where(and(eq(moodChecks.patientId, patient.id), gte(moodChecks.checkedAt, since)))
          .orderBy(desc(moodChecks.checkedAt))
          .limit(1)
      : Promise.resolve([]),
  ]);

  return {
    patient,
    link,
    from: data.from,
    today: clock.today,
    series: fastingSeries(readings, data.from, clock.today),
    readingCount: readings.length,
    fastingAvg: fasting.length ? Math.round(fasting.reduce((a, b) => a + b, 0) / fasting.length) : null,
    fastingCount: fasting.length,
    inRangePercent: readings.length ? Math.round((100 * inRange) / readings.length) : null,
    adherence: adherence(data.medData.meds, data.medData.logs, data.from, clock.today, clock),
    labs,
    alerts: {
      urgent: alertCounts.find((a) => a.severity === "urgent")?.n ?? 0,
      warning: alertCounts.find((a) => a.severity === "warning")?.n ?? 0,
    },
    insights,
    mood: mood[0] ?? null,
  };
}
