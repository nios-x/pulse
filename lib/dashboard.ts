import { and, asc, desc, eq, gte, lt, lte } from "drizzle-orm";
import { db } from "@/db";
import { dailyCheckins, glucoseReadings, type Patient } from "@/db/schema";
import { adherence, type Clock } from "@/lib/adherence";
import { addDays, istDate, istDateTime } from "@/lib/dates";
import { addMonths, markMonth, monthBounds } from "@/lib/day-marks";
import { fastingSeries, type ReadingIn } from "@/lib/insights";
import { loadMeds } from "@/lib/meds";
import type { PermissionMap } from "@/lib/permissions";
import { glucoseStatus } from "@/lib/vitals";

/** Days on the home chart; the four tiles look back one week. */
export const CHART_DAYS = 14;
export const WEEK_DAYS = 7;

/** Share of readings in the usual range. Null with no readings. */
export function inRangeShare(readings: readonly ReadingIn[], limits: Pick<Patient, "glucoseLow" | "glucoseHigh">) {
  if (readings.length === 0) return null;
  const ok = readings.filter((r) => glucoseStatus(r.mgdl, r.context, limits).tone === "ok").length;
  return { ok, total: readings.length, percent: Math.round((ok / readings.length) * 100) };
}

/** The home dashboard: a two-week fasting chart and four one-week numbers, each null when hidden. */
export async function loadDashboard(patient: Patient, clock: Clock, can: PermissionMap) {
  const chartFrom = addDays(clock.today, -(CHART_DAYS - 1));
  const weekFrom = addDays(clock.today, -(WEEK_DAYS - 1));

  const [readings, [latest], medData, checkins] = await Promise.all([
    can.view_vitals
      ? db
          .select({ mgdl: glucoseReadings.mgdl, context: glucoseReadings.context, measuredAt: glucoseReadings.measuredAt })
          .from(glucoseReadings)
          .where(and(eq(glucoseReadings.patientId, patient.id), gte(glucoseReadings.measuredAt, istDateTime(chartFrom))))
          .orderBy(asc(glucoseReadings.measuredAt))
      : [],
    can.view_vitals
      ? db
          .select({ mgdl: glucoseReadings.mgdl, context: glucoseReadings.context, measuredAt: glucoseReadings.measuredAt })
          .from(glucoseReadings)
          .where(eq(glucoseReadings.patientId, patient.id))
          .orderBy(desc(glucoseReadings.measuredAt))
          .limit(1)
      : [],
    can.view_meds ? loadMeds(patient.id, weekFrom) : null,
    db
      .select({ walked: dailyCheckins.walked })
      .from(dailyCheckins)
      .where(and(eq(dailyCheckins.patientId, patient.id), gte(dailyCheckins.date, weekFrom))),
  ]);

  const week = readings.filter((r) => istDate(r.measuredAt) >= weekFrom);
  const doses = medData && medData.meds.length > 0 ? adherence(medData.meds, medData.logs, weekFrom, clock.today, clock) : null;

  return {
    series: can.view_vitals ? fastingSeries(readings, chartFrom, clock.today) : null,
    latest: can.view_vitals ? (latest ?? null) : undefined,
    inRange: can.view_vitals ? inRangeShare(week, patient) : undefined,
    doses: can.view_meds ? doses : undefined,
    walkedDays: checkins.filter((c) => c.walked).length,
  };
}

/** One month of rule-based day marks for the home calendar. Null when the viewer sees neither sugar nor medicines. */
export async function loadMonthMarks(patient: Patient, month: string, clock: Clock, can: PermissionMap) {
  if (!can.view_vitals && !can.view_meds) return null;
  const { from, to } = monthBounds(month);
  const [readings, medData, checkins] = await Promise.all([
    can.view_vitals
      ? db
          .select({ mgdl: glucoseReadings.mgdl, context: glucoseReadings.context, measuredAt: glucoseReadings.measuredAt })
          .from(glucoseReadings)
          .where(
            and(
              eq(glucoseReadings.patientId, patient.id),
              gte(glucoseReadings.measuredAt, istDateTime(from)),
              lt(glucoseReadings.measuredAt, istDateTime(`${addMonths(month, 1)}-01`))
            )
          )
      : [],
    can.view_meds ? loadMeds(patient.id, from) : null,
    db
      .select({ date: dailyCheckins.date, walked: dailyCheckins.walked })
      .from(dailyCheckins)
      .where(and(eq(dailyCheckins.patientId, patient.id), gte(dailyCheckins.date, from), lte(dailyCheckins.date, to))),
  ]);
  const doses = (date: string) => {
    if (!medData || medData.meds.length === 0) return null;
    const { taken, missed } = adherence(medData.meds, medData.logs, date, date, clock);
    return { taken, missed };
  };
  const walkedDates = new Set(checkins.filter((c) => c.walked).map((c) => c.date));
  return markMonth(month, clock.today, { readings, doses, walkedDates }, patient);
}
