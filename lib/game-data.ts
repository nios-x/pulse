import "server-only";
import { and, desc, eq, gte, inArray } from "drizzle-orm";
import { db } from "@/db";
import { carePlans, doseLogs, graceDays, habitLogs, medications, protocolLogs, vitals, type HabitKind } from "@/db/schema";
import { addDays, istDate } from "@/lib/dates";
import { HABIT_GOAL, summarize, type DayActivity, type GameSummary } from "@/lib/gamification";
import type { ScoreDay } from "@/lib/health-score";
import { scheduleFor } from "@/lib/meds";
import { classify } from "@/lib/vitals";

const PLAN_HABITS: HabitKind[] = ["water", "walk", "sleep", "produce"];

/** Raw activity for members over the last `days` days, in one round trip per table. */
async function load(memberIds: string[], days: number) {
  const today = istDate();
  const from = addDays(today, -(days - 1));
  if (!memberIds.length) return { today, from, meds: [], logs: [], vit: [], habits: [], protocol: [], grace: [] };
  const [meds, logs, vit, habits, protocol, grace] = await Promise.all([
    db.select().from(medications).where(inArray(medications.memberId, memberIds)),
    db.select().from(doseLogs).where(and(inArray(doseLogs.memberId, memberIds), gte(doseLogs.date, from))),
    db.select().from(vitals).where(and(inArray(vitals.memberId, memberIds), gte(vitals.measuredAt, new Date(`${from}T00:00:00+05:30`)))),
    db.select().from(habitLogs).where(and(inArray(habitLogs.memberId, memberIds), gte(habitLogs.date, from))),
    db.select().from(protocolLogs).where(and(inArray(protocolLogs.memberId, memberIds), gte(protocolLogs.date, from))),
    db.select().from(graceDays).where(and(inArray(graceDays.memberId, memberIds), gte(graceDays.date, from))),
  ]);
  return { today, from, meds, logs, vit, habits, protocol, grace };
}

function activityFor(memberId: string, data: Awaited<ReturnType<typeof load>>, days: number): DayActivity[] {
  const meds = data.meds.filter((m) => m.memberId === memberId);
  const out: DayActivity[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const date = addDays(data.today, -i);
    const scheduled = scheduleFor(meds, date);
    const taken = data.logs.filter((l) => l.memberId === memberId && l.date === date && l.status === "taken").length;
    const habits: DayActivity["habits"] = {};
    for (const h of data.habits) if (h.memberId === memberId && h.date === date) habits[h.kind] = Number(h.value);
    out.push({
      date,
      dosesDue: scheduled.length,
      dosesTaken: Math.min(taken, scheduled.length),
      vitals: data.vit.filter((v) => v.memberId === memberId && istDate(v.measuredAt) === date).length,
      habits,
      protocol: data.protocol.filter((p) => p.memberId === memberId && p.date === date).length,
      grace: data.grace.some((g) => g.memberId === memberId && g.date === date),
    });
  }
  return out;
}

export async function getGameSummaries(memberIds: string[], days = 90): Promise<Map<string, GameSummary & { todayActivity: DayActivity }>> {
  const data = await load(memberIds, days);
  const out = new Map<string, GameSummary & { todayActivity: DayActivity }>();
  for (const id of memberIds) {
    const list = activityFor(id, data, days);
    out.set(id, { ...summarize(list, data.today), todayActivity: list[list.length - 1] });
  }
  return out;
}

/** Day-by-day inputs for the weekly health score and trend lines. */
export async function getScoreDays(memberId: string, days = 63): Promise<ScoreDay[]> {
  const data = await load([memberId], days);
  const meds = data.meds.filter((m) => m.memberId === memberId);
  const out: ScoreDay[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const date = addDays(data.today, -i);
    const dayVitals = data.vit.filter((v) => istDate(v.measuredAt) === date);
    const habits = data.habits.filter((h) => h.date === date);
    out.push({
      date,
      dosesDue: scheduleFor(meds, date).length,
      dosesTaken: data.logs.filter((l) => l.date === date && l.status === "taken").length,
      readings: dayVitals.filter((v) => v.kind !== "weight").map((v) => ({ inRange: classify(v).status === "normal" })),
      habitGoals: {
        total: PLAN_HABITS.length,
        met: PLAN_HABITS.filter((k) => Number(habits.find((h) => h.kind === k)?.value ?? 0) >= HABIT_GOAL[k]).length,
      },
      bpSys: dayVitals.filter((v) => v.kind === "bp").map((v) => Number(v.value)),
      sugarFasting: dayVitals.filter((v) => v.kind === "sugar" && v.context === "fasting").map((v) => Number(v.value)),
      weight: dayVitals.filter((v) => v.kind === "weight").map((v) => Number(v.value)),
    });
  }
  return out;
}

export async function getActivePlan(memberId: string) {
  const [plan] = await db
    .select()
    .from(carePlans)
    .where(and(eq(carePlans.memberId, memberId), eq(carePlans.active, true)))
    .orderBy(desc(carePlans.createdAt))
    .limit(1);
  return plan ?? null;
}

export async function getTodayHabits(memberId: string) {
  const rows = await db.select().from(habitLogs).where(and(eq(habitLogs.memberId, memberId), eq(habitLogs.date, istDate())));
  return Object.fromEntries(rows.map((r) => [r.kind, Number(r.value)])) as Partial<Record<HabitKind, number>>;
}
