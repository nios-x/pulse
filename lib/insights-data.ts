import { and, asc, eq, gte } from "drizzle-orm";
import { db } from "@/db";
import { dailyCheckins, glucoseReadings, meals } from "@/db/schema";
import { adherence } from "@/lib/adherence";
import { addDays, istDateTime } from "@/lib/dates";
import { weekWindows } from "@/lib/insights";
import { loadMeds } from "@/lib/meds";

/** Everything lib/insights.ts needs for the last `days` days. */
export async function loadInsightInputs(patientId: string, clock: { today: string; nowMinutes: number }, days = 30) {
  const from = addDays(clock.today, -(days - 1));
  const since = istDateTime(addDays(from, -1));
  const [readings, mealRows, checkins, medData] = await Promise.all([
    db
      .select({ mgdl: glucoseReadings.mgdl, context: glucoseReadings.context, measuredAt: glucoseReadings.measuredAt })
      .from(glucoseReadings)
      .where(and(eq(glucoseReadings.patientId, patientId), gte(glucoseReadings.measuredAt, since)))
      .orderBy(asc(glucoseReadings.measuredAt)),
    db
      .select({ slot: meals.slot, items: meals.items, eatenAt: meals.eatenAt })
      .from(meals)
      .where(and(eq(meals.patientId, patientId), gte(meals.eatenAt, since))),
    db
      .select({ date: dailyCheckins.date, walked: dailyCheckins.walked })
      .from(dailyCheckins)
      .where(and(eq(dailyCheckins.patientId, patientId), gte(dailyCheckins.date, addDays(from, -1)))),
    loadMeds(patientId, from),
  ]);
  const weeks = weekWindows(clock.today, Math.floor(days / 7)).map((w) => ({
    ...w,
    percent: adherence(medData.meds, medData.logs, w.from, w.to, clock).percent,
  }));
  return { from, readings, meals: mealRows, checkins, weeks, medData };
}
