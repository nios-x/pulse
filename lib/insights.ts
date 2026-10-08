// Insights are plain averages over the last 30 days that the team can explain.
// No AI. Every function returns null when the data is too thin to say anything.

import { addDays, dateRange, istDate } from "@/lib/dates";
import { getFood, isHighCarb } from "@/lib/foods";

export const MIN_READINGS = 3; // per group
export const MEAL_MIN_GAP = 20; // mg/dL
export const OTHER_MIN_GAP = 10; // mg/dL, walk and medicine effects
export const MEAL_WINDOW_MS = 3 * 60 * 60 * 1000;
export const GOOD_ADHERENCE = 80; // percent

export type ReadingIn = { mgdl: number; context: "fasting" | "after_meal" | "random"; measuredAt: Date };
export type MealIn = { slot: "breakfast" | "lunch" | "dinner" | "snack"; items: readonly string[]; eatenAt: Date };
export type CheckinIn = { date: string; walked: boolean | null };
export type WeekIn = { from: string; to: string; percent: number | null };

const avg = (xs: number[]) => Math.round(xs.reduce((a, b) => a + b, 0) / xs.length);

function mostCommon(lists: readonly (readonly string[])[], keep: (key: string) => boolean): string | null {
  const counts = new Map<string, number>();
  for (const list of lists) for (const k of new Set(list)) if (keep(k)) counts.set(k, (counts.get(k) ?? 0) + 1);
  let best: string | null = null;
  for (const [k, n] of counts) if (best === null || n > counts.get(best)!) best = k;
  return best;
}

/** Each after-meal reading with the latest meal in the 3 hours before it. */
export function pairAfterMealReadings(readings: readonly ReadingIn[], meals: readonly MealIn[]) {
  const sorted = [...meals].sort((a, b) => a.eatenAt.getTime() - b.eatenAt.getTime());
  const pairs: { mgdl: number; meal: MealIn }[] = [];
  for (const r of readings) {
    if (r.context !== "after_meal") continue;
    const t = r.measuredAt.getTime();
    let match: MealIn | null = null;
    for (const m of sorted) {
      const mt = m.eatenAt.getTime();
      if (mt > t) break;
      if (t - mt <= MEAL_WINDOW_MS) match = m;
    }
    if (match) pairs.push({ mgdl: r.mgdl, meal: match });
  }
  return pairs;
}

function splitByCarbs(pairs: { mgdl: number; meal: MealIn }[]) {
  const high = pairs.filter((p) => p.meal.items.some(isHighCarb));
  const low = pairs.filter((p) => !p.meal.items.some(isHighCarb));
  return { high, low };
}

export type MealInsight = {
  kind: "meal";
  slot: "dinner" | null;
  highItem: string;
  lowItem: string;
  highAvg: number;
  lowAvg: number;
  n: number;
};

/**
 * Meal effect: after-meal sugar for meals with a high-carb item vs without.
 * Dinners first (the clearest pattern), then all meals.
 */
export function mealEffect(readings: readonly ReadingIn[], meals: readonly MealIn[]): MealInsight | null {
  const pairs = pairAfterMealReadings(readings, meals);
  const candidates = [
    { slot: "dinner" as const, pairs: pairs.filter((p) => p.meal.slot === "dinner") },
    { slot: null, pairs },
  ];
  for (const { slot, pairs: group } of candidates) {
    const { high, low } = splitByCarbs(group);
    if (high.length < MIN_READINGS || low.length < MIN_READINGS) continue;
    const highAvg = avg(high.map((p) => p.mgdl));
    const lowAvg = avg(low.map((p) => p.mgdl));
    if (Math.abs(highAvg - lowAvg) < MEAL_MIN_GAP) continue;
    const highItem = mostCommon(high.map((p) => p.meal.items), isHighCarb);
    const lowItem =
      mostCommon(low.map((p) => p.meal.items), (k) => getFood(k)?.carb === "medium") ??
      mostCommon(low.map((p) => p.meal.items), () => true);
    if (!highItem || !lowItem) continue;
    return { kind: "meal", slot, highItem, lowItem, highAvg, lowAvg, n: high.length + low.length };
  }
  return null;
}

/** How many more after-dinner readings before the meal card can appear (0 = enough). */
export function afterDinnerReadingsNeeded(readings: readonly ReadingIn[], meals: readonly MealIn[]): number {
  const dinners = pairAfterMealReadings(readings, meals).filter((p) => p.meal.slot === "dinner");
  const { high, low } = splitByCarbs(dinners);
  return Math.max(0, MIN_READINGS - Math.min(high.length, low.length));
}

export type WalkInsight = { kind: "walk"; walkedAvg: number; restAvg: number; n: number };

/** Walk effect: next-morning fasting sugar after days walked vs not walked. */
export function walkEffect(readings: readonly ReadingIn[], checkins: readonly CheckinIn[]): WalkInsight | null {
  const fastingByDate = new Map<string, number>();
  for (const r of [...readings].sort((a, b) => a.measuredAt.getTime() - b.measuredAt.getTime())) {
    if (r.context !== "fasting") continue;
    const d = istDate(r.measuredAt);
    if (!fastingByDate.has(d)) fastingByDate.set(d, r.mgdl); // first fasting reading of the morning
  }
  const walked: number[] = [];
  const rest: number[] = [];
  for (const c of checkins) {
    if (c.walked === null) continue;
    const next = fastingByDate.get(addDays(c.date, 1));
    if (next === undefined) continue;
    (c.walked ? walked : rest).push(next);
  }
  if (walked.length < MIN_READINGS || rest.length < MIN_READINGS) return null;
  const walkedAvg = avg(walked);
  const restAvg = avg(rest);
  if (Math.abs(walkedAvg - restAvg) < OTHER_MIN_GAP) return null;
  return { kind: "walk", walkedAvg, restAvg, n: walked.length + rest.length };
}

export type MedicineInsight = { kind: "medicine"; goodAvg: number; lowAvg: number; n: number };

/** Medicine effect: fasting sugar in weeks with 80%+ of doses taken vs weeks below. */
export function medicineEffect(readings: readonly ReadingIn[], weeks: readonly WeekIn[]): MedicineInsight | null {
  const good: number[] = [];
  const low: number[] = [];
  for (const week of weeks) {
    if (week.percent === null) continue;
    const values = readings
      .filter((r) => r.context === "fasting")
      .filter((r) => {
        const d = istDate(r.measuredAt);
        return d >= week.from && d <= week.to;
      })
      .map((r) => r.mgdl);
    (week.percent >= GOOD_ADHERENCE ? good : low).push(...values);
  }
  if (good.length < MIN_READINGS || low.length < MIN_READINGS) return null;
  const goodAvg = avg(good);
  const lowAvg = avg(low);
  if (Math.abs(goodAvg - lowAvg) < OTHER_MIN_GAP) return null;
  return { kind: "medicine", goodAvg, lowAvg, n: good.length + low.length };
}

export type TrendInsight = { kind: "trend"; thisAvg: number; lastAvg: number; direction: "up" | "down" | "steady" };

/** This week's fasting average vs last week's. */
export function fastingTrend(readings: readonly ReadingIn[], today: string): TrendInsight | null {
  const inRange = (from: string, to: string) =>
    readings
      .filter((r) => r.context === "fasting")
      .filter((r) => {
        const d = istDate(r.measuredAt);
        return d >= from && d <= to;
      })
      .map((r) => r.mgdl);
  const thisWeek = inRange(addDays(today, -6), today);
  const lastWeek = inRange(addDays(today, -13), addDays(today, -7));
  if (thisWeek.length < MIN_READINGS || lastWeek.length < MIN_READINGS) return null;
  const thisAvg = avg(thisWeek);
  const lastAvg = avg(lastWeek);
  const diff = thisAvg - lastAvg;
  return { kind: "trend", thisAvg, lastAvg, direction: Math.abs(diff) < 5 ? "steady" : diff > 0 ? "up" : "down" };
}

/** Rolling 7-day windows ending today, newest first: [today-6..today], [today-13..today-7], ... */
export function weekWindows(today: string, count = 4): { from: string; to: string }[] {
  return Array.from({ length: count }, (_, i) => ({
    from: addDays(today, -7 * i - 6),
    to: addDays(today, -7 * i),
  }));
}

/** Daily fasting average for the chart; null on days without a fasting reading. */
export function fastingSeries(readings: readonly ReadingIn[], from: string, to: string) {
  const byDate = new Map<string, number[]>();
  for (const r of readings) {
    if (r.context !== "fasting") continue;
    const d = istDate(r.measuredAt);
    byDate.set(d, [...(byDate.get(d) ?? []), r.mgdl]);
  }
  return dateRange(from, to).map((date) => {
    const values = byDate.get(date);
    return { date, mgdl: values ? avg(values) : null };
  });
}

export type Insight = MealInsight | WalkInsight | MedicineInsight | TrendInsight;
