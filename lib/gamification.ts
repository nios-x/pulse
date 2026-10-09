import type { HabitKind } from "@/db/schema";
import { addDays } from "@/lib/dates";

/**
 * Streaks, quests, XP, levels, badges and a 90-day tally.
 * Everything is derived from what people actually logged (doses, readings, habits),
 * so it can't drift out of sync and needs no separate ledger.
 */

export type QuestKey = "meds" | "vital" | "water" | "walk" | "produce" | "sleep";

export type QuestDef = { key: QuestKey; title: string; short: string; goal: number; unit: string; xp: number; habit?: HabitKind };

export const QUESTS: QuestDef[] = [
  { key: "meds", title: "Take all of today's medicines", short: "Medicines", goal: 1, unit: "", xp: 30 },
  { key: "vital", title: "Record a reading", short: "Reading", goal: 1, unit: "", xp: 15 },
  { key: "water", title: "Drink 8 glasses of water", short: "Water", goal: 8, unit: "glasses", xp: 15, habit: "water" },
  { key: "walk", title: "Walk for 30 minutes", short: "Walk", goal: 30, unit: "min", xp: 20, habit: "walk" },
  { key: "produce", title: "Eat 5 servings of fruit & veg", short: "Fruit & veg", goal: 5, unit: "servings", xp: 15, habit: "produce" },
  { key: "sleep", title: "Sleep 7 hours or more", short: "Sleep", goal: 7, unit: "hours", xp: 15, habit: "sleep" },
];

export const HABIT_GOAL: Record<HabitKind, number> = { water: 8, walk: 30, sleep: 7, produce: 5, mindful: 10 };

export const XP_PER_DOSE = 5;
/** A day counts towards the streak when this many quests are done. */
export const STREAK_QUESTS = 3;

export type DayActivity = {
  date: string;
  dosesDue: number;
  dosesTaken: number;
  vitals: number;
  habits: Partial<Record<HabitKind, number>>;
  protocol?: number;
  grace?: boolean;
};

export function questsDone(day: DayActivity): QuestKey[] {
  const done: QuestKey[] = [];
  if (day.dosesDue > 0 && day.dosesTaken >= day.dosesDue) done.push("meds");
  if (day.vitals > 0) done.push("vital");
  for (const q of QUESTS) {
    if (q.habit && (day.habits[q.habit] ?? 0) >= q.goal) done.push(q.key);
  }
  return done;
}

/** Quests that apply today: the medicine quest only exists if doses are scheduled. */
export function questsFor(day: DayActivity): QuestDef[] {
  return QUESTS.filter((q) => q.key !== "meds" || day.dosesDue > 0);
}

export function dayComplete(day: DayActivity): boolean {
  return questsDone(day).length >= STREAK_QUESTS;
}

export function dayXp(day: DayActivity): number {
  const quests = questsDone(day).reduce((s, k) => s + QUESTS.find((q) => q.key === k)!.xp, 0);
  const mindful = (day.habits.mindful ?? 0) >= HABIT_GOAL.mindful ? 10 : 0;
  return quests + day.dosesTaken * XP_PER_DOSE + mindful + (day.protocol ?? 0) * 5;
}

/**
 * Current streak: consecutive complete days ending today (or yesterday, while today
 * is still in progress). Grace days pause the streak without breaking it.
 */
export function currentStreak(days: Map<string, DayActivity>, today: string): number {
  let streak = 0;
  let date = today;
  const todayDay = days.get(today);
  if (!todayDay || (!dayComplete(todayDay) && !todayDay.grace)) date = addDays(today, -1);
  for (let i = 0; i < 400; i++) {
    const d = days.get(date);
    if (d?.grace) {
      date = addDays(date, -1);
      continue;
    }
    if (!d || !dayComplete(d)) break;
    streak++;
    date = addDays(date, -1);
  }
  return streak;
}

export function bestStreak(days: Map<string, DayActivity>): number {
  const dates = [...days.keys()].sort();
  if (!dates.length) return 0;
  let best = 0;
  let run = 0;
  let cursor = dates[0];
  const last = dates[dates.length - 1];
  while (cursor <= last) {
    const d = days.get(cursor);
    if (d?.grace) {
      // pause
    } else if (d && dayComplete(d)) {
      run++;
      best = Math.max(best, run);
    } else {
      run = 0;
    }
    cursor = addDays(cursor, 1);
  }
  return best;
}

export const LEVELS = [
  { min: 0, name: "Starter" },
  { min: 150, name: "Regular" },
  { min: 400, name: "Steady" },
  { min: 800, name: "Consistent" },
  { min: 1400, name: "Committed" },
  { min: 2200, name: "Dedicated" },
  { min: 3200, name: "Seasoned" },
  { min: 4500, name: "Exemplary" },
] as const;

export function levelFor(xp: number) {
  let index = 0;
  for (let i = 0; i < LEVELS.length; i++) if (xp >= LEVELS[i].min) index = i;
  const current = LEVELS[index];
  const next = LEVELS[index + 1] ?? null;
  const progress = next ? (xp - current.min) / (next.min - current.min) : 1;
  return { index, level: index + 1, name: current.name, next, xpToNext: next ? next.min - xp : 0, progress: Math.max(0, Math.min(1, progress)) };
}

export type BadgeKey =
  | "first_steps"
  | "streak_3"
  | "streak_7"
  | "streak_14"
  | "streak_30"
  | "perfect_week"
  | "hydration_hero"
  | "walker"
  | "vitals_pro"
  | "green_plate"
  | "sleep_champ"
  | "pcos_warrior";

export const BADGES: Record<BadgeKey, { title: string; description: string }> = {
  first_steps: { title: "First steps", description: "Finish your first daily quest" },
  streak_3: { title: "Warming up", description: "Keep a 3-day streak" },
  streak_7: { title: "Full week", description: "Keep a 7-day streak" },
  streak_14: { title: "Two weeks strong", description: "Keep a 14-day streak" },
  streak_30: { title: "Thirty days", description: "Keep a 30-day streak" },
  perfect_week: { title: "Perfect week", description: "Every medicine dose taken for 7 days in a row" },
  hydration_hero: { title: "Well hydrated", description: "8 glasses of water on 7 days" },
  walker: { title: "Walker", description: "30-minute walks on 10 days" },
  vitals_pro: { title: "Regular readings", description: "Readings recorded on 14 days" },
  green_plate: { title: "Green plate", description: "5 fruit & veg servings on 7 days" },
  sleep_champ: { title: "Well rested", description: "7+ hours of sleep on 7 days" },
  pcos_warrior: { title: "Rhythm keeper", description: "20 PCOS protocol actions done" },
};

export type TallyKey = QuestKey | "mindful";

export type GameSummary = {
  xp: number;
  weeklyXp: number;
  level: ReturnType<typeof levelFor>;
  streak: number;
  bestStreak: number;
  today: { done: QuestKey[]; available: QuestDef[]; complete: boolean };
  badges: { key: BadgeKey; earned: boolean }[];
  /** Days each quest was done (plus mindful minutes) across the logged period. */
  tally: Record<TallyKey, number>;
  last7: { date: string; complete: boolean; grace: boolean; quests: number }[];
};

export function summarize(daysList: DayActivity[], today: string): GameSummary {
  const days = new Map(daysList.map((d) => [d.date, d]));
  const todayDay = days.get(today) ?? { date: today, dosesDue: 0, dosesTaken: 0, vitals: 0, habits: {} };
  const xp = daysList.reduce((s, d) => s + dayXp(d), 0);
  const weekStart = addDays(today, -6);
  const weeklyXp = daysList.filter((d) => d.date >= weekStart && d.date <= today).reduce((s, d) => s + dayXp(d), 0);
  const best = bestStreak(days);
  const count = (key: QuestKey) => daysList.filter((d) => questsDone(d).includes(key)).length;
  let medsRun = 0;
  let bestMedsRun = 0;
  for (const d of [...daysList].sort((a, b) => a.date.localeCompare(b.date))) {
    if (d.dosesDue > 0 && d.dosesTaken >= d.dosesDue) {
      medsRun++;
      bestMedsRun = Math.max(bestMedsRun, medsRun);
    } else if (d.dosesDue > 0) medsRun = 0;
  }
  const protocolTotal = daysList.reduce((s, d) => s + (d.protocol ?? 0), 0);
  const anyQuest = daysList.some((d) => questsDone(d).length > 0);
  const earned: Record<BadgeKey, boolean> = {
    first_steps: anyQuest,
    streak_3: best >= 3,
    streak_7: best >= 7,
    streak_14: best >= 14,
    streak_30: best >= 30,
    perfect_week: bestMedsRun >= 7,
    hydration_hero: count("water") >= 7,
    walker: count("walk") >= 10,
    vitals_pro: count("vital") >= 14,
    green_plate: count("produce") >= 7,
    sleep_champ: count("sleep") >= 7,
    pcos_warrior: protocolTotal >= 20,
  };
  const tally: Record<TallyKey, number> = { meds: 0, vital: 0, water: 0, walk: 0, produce: 0, sleep: 0, mindful: 0 };
  for (const d of daysList) {
    for (const k of questsDone(d)) tally[k]++;
    if ((d.habits.mindful ?? 0) >= HABIT_GOAL.mindful) tally.mindful++;
  }
  const last7 = Array.from({ length: 7 }, (_, i) => {
    const date = addDays(today, i - 6);
    const d = days.get(date);
    return { date, complete: d ? dayComplete(d) : false, grace: Boolean(d?.grace), quests: d ? questsDone(d).length : 0 };
  });
  return {
    xp,
    weeklyXp,
    level: levelFor(xp),
    streak: currentStreak(days, today),
    bestStreak: best,
    today: { done: questsDone(todayDay), available: questsFor(todayDay), complete: dayComplete(todayDay) },
    badges: (Object.keys(BADGES) as BadgeKey[]).map((key) => ({ key, earned: earned[key] })),
    tally,
    last7,
  };
}
