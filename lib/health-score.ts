import { addDays, weekday } from "@/lib/dates";

/**
 * A simple, explainable weekly "health score" (0–100) to show progress after a
 * care plan starts. It is a habit-and-tracking score, not a medical measure:
 *   40% medicines taken · 35% readings in the usual range · 25% daily habit goals met.
 * Components with no data that week are left out and the rest re-weighted.
 */

export type ScoreDay = {
  date: string;
  dosesDue: number;
  dosesTaken: number;
  readings: { inRange: boolean }[];
  habitGoals: { met: number; total: number };
  bpSys?: number[];
  sugarFasting?: number[];
  weight?: number[];
};

export type WeekScore = {
  weekStart: string;
  label: string;
  score: number | null;
  adherence: number | null;
  inRange: number | null;
  habits: number | null;
  bpSys: number | null;
  sugarFasting: number | null;
  weight: number | null;
  afterPlan: boolean;
};

const WEIGHTS = { adherence: 0.4, inRange: 0.35, habits: 0.25 };

const avg = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);

export function mondayOf(date: string): string {
  return addDays(date, -((weekday(date) + 6) % 7));
}

export function scoreWeek(days: ScoreDay[]): Pick<WeekScore, "score" | "adherence" | "inRange" | "habits"> {
  const due = days.reduce((s, d) => s + d.dosesDue, 0);
  const taken = days.reduce((s, d) => s + Math.min(d.dosesTaken, d.dosesDue), 0);
  const readings = days.flatMap((d) => d.readings);
  const goalsTotal = days.reduce((s, d) => s + d.habitGoals.total, 0);
  const goalsMet = days.reduce((s, d) => s + d.habitGoals.met, 0);
  const parts = {
    adherence: due ? (taken / due) * 100 : null,
    inRange: readings.length ? (readings.filter((r) => r.inRange).length / readings.length) * 100 : null,
    habits: goalsTotal ? (goalsMet / goalsTotal) * 100 : null,
  };
  let wsum = 0;
  let total = 0;
  for (const k of Object.keys(WEIGHTS) as (keyof typeof WEIGHTS)[]) {
    if (parts[k] == null) continue;
    wsum += WEIGHTS[k];
    total += WEIGHTS[k] * parts[k]!;
  }
  const round = (n: number | null) => (n == null ? null : Math.round(n));
  return { score: wsum ? Math.round(total / wsum) : null, adherence: round(parts.adherence), inRange: round(parts.inRange), habits: round(parts.habits) };
}

const fmt = new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", timeZone: "UTC" });

export function weeklyScores(days: ScoreDay[], planStartedOn: string | null): WeekScore[] {
  const byWeek = new Map<string, ScoreDay[]>();
  for (const d of days) {
    const w = mondayOf(d.date);
    byWeek.set(w, [...(byWeek.get(w) ?? []), d]);
  }
  return [...byWeek.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    // A partial first week (fewer than 4 days of data) would skew the chart
    .filter(([, list], i) => i > 0 || list.length >= 4)
    .map(([weekStart, list]) => {
      const s = scoreWeek(list);
      const r1 = (n: number | null) => (n == null ? null : Math.round(n * 10) / 10);
      return {
        weekStart,
        label: fmt.format(new Date(`${weekStart}T00:00:00Z`)),
        ...s,
        bpSys: r1(avg(list.flatMap((d) => d.bpSys ?? []))),
        sugarFasting: r1(avg(list.flatMap((d) => d.sugarFasting ?? []))),
        weight: r1(avg(list.flatMap((d) => d.weight ?? []))),
        afterPlan: planStartedOn != null && addDays(weekStart, 6) >= planStartedOn,
      };
    });
}

/** Before vs after the plan: average of up to 4 weeks on each side. */
export function improvement(weeks: WeekScore[], key: "score" | "bpSys" | "sugarFasting" | "weight" | "adherence") {
  const before = weeks.filter((w) => !w.afterPlan && w[key] != null).slice(-4).map((w) => w[key]!);
  const after = weeks.filter((w) => w.afterPlan && w[key] != null).slice(-4).map((w) => w[key]!);
  const b = avg(before);
  const a = avg(after);
  if (b == null || a == null) return null;
  return { before: Math.round(b * 10) / 10, after: Math.round(a * 10) / 10, change: Math.round((a - b) * 10) / 10 };
}
