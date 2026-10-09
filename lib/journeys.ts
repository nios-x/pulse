import { dayComplete, dayXp, LEVELS, questsDone, type DayActivity } from "@/lib/gamification";

/*
 * Journeys: long roads made of milestones, one per habit. Like the rest of the game they're
 * derived from what was actually logged, including the day each milestone was reached,
 * so the wins on the page are real and can be dated.
 */

export type JourneyKey = "level" | "streak" | "meds" | "water" | "walk" | "vital" | "sleep" | "produce";

export type Milestone = { at: number; label: string; reachedOn: string | null };

export type Journey = {
  key: JourneyKey;
  title: string;
  /** What moves you along this road, in a few words. */
  how: string;
  value: number;
  /** The value written out with its unit: "120 glasses", "6 hours". */
  valueLabel: string;
  /** The first stop (at 0) is the start line. */
  milestones: Milestone[];
  /** "12 more glasses", or null at the end of the road. */
  toGo: string | null;
  note?: string;
};

export type Win = { journey: JourneyKey; title: string; label: string; date: string };

type Def = {
  key: JourneyKey;
  title: string;
  how: string;
  start: string;
  stops: { at: number; label: string }[];
  /** How far one day moves you. Ignored for the streak, which is a run, not a sum. */
  step: (d: DayActivity) => number;
  amount: (n: number) => string;
};

const plural = (n: number, one: string, many = `${one}s`) => `${n.toLocaleString("en-IN")} ${n === 1 ? one : many}`;
const minutes = (n: number) => (n < 60 ? plural(n, "minute") : plural(Math.round(n / 6) / 10, "hour"));
const stops = (ats: number[], label: (n: number) => string) => ats.map((at) => ({ at, label: label(at) }));

const DEFS: Def[] = [
  {
    key: "level",
    title: "Levels",
    how: "Every quest, dose and habit earns XP",
    start: LEVELS[0].name,
    stops: LEVELS.slice(1).map((l) => ({ at: l.min, label: l.name })),
    step: dayXp,
    amount: (n) => `${n.toLocaleString("en-IN")} XP`,
  },
  {
    key: "streak",
    title: "Streak",
    how: "Finish 3 quests a day, rest days included",
    start: "Day one",
    stops: stops([3, 7, 14, 30, 60, 90], (n) => `${n}-day streak`),
    step: () => 0,
    amount: (n) => plural(n, "more day", "more days"),
  },
  {
    key: "meds",
    title: "Medicines",
    how: "Each dose taken on time",
    start: "First dose",
    stops: stops([10, 30, 75, 150, 300], (n) => plural(n, "dose")),
    step: (d) => d.dosesTaken,
    amount: (n) => plural(n, "dose"),
  },
  {
    key: "water",
    title: "Water",
    how: "Every glass you log",
    start: "First sip",
    stops: stops([8, 40, 100, 200, 400], (n) => plural(n, "glass", "glasses")),
    step: (d) => d.habits.water ?? 0,
    amount: (n) => plural(n, "glass", "glasses"),
  },
  {
    key: "walk",
    title: "Walking",
    how: "Minutes walked, added up",
    start: "First steps",
    stops: stops([30, 150, 300, 600, 1200, 2400], minutes),
    step: (d) => d.habits.walk ?? 0,
    amount: minutes,
  },
  {
    key: "vital",
    title: "Readings",
    how: "Each BP, sugar or weight reading",
    start: "Getting started",
    stops: stops([1, 5, 15, 30, 60], (n) => (n === 1 ? "First reading" : plural(n, "reading"))),
    step: (d) => d.vitals,
    amount: (n) => plural(n, "reading"),
  },
  {
    key: "sleep",
    title: "Sleep",
    how: "Nights of 7 hours or more",
    start: "First night",
    stops: stops([1, 7, 14, 30, 60], (n) => plural(n, "good night")),
    step: (d) => ((d.habits.sleep ?? 0) >= 7 ? 1 : 0),
    amount: (n) => plural(n, "good night"),
  },
  {
    key: "produce",
    title: "Fruit & veg",
    how: "Every serving on the plate",
    start: "First bite",
    stops: stops([5, 25, 75, 150, 300], (n) => plural(n, "serving")),
    step: (d) => d.habits.produce ?? 0,
    amount: (n) => plural(n, "serving"),
  },
];

/** Best-run streak per day, with rest days pausing the run (as in `bestStreak`). */
function streakRuns(days: DayActivity[]) {
  let run = 0;
  let best = 0;
  return days.map((d) => {
    if (d.grace) {
      // pause
    } else if (dayComplete(d)) run++;
    else run = 0;
    best = Math.max(best, run);
    return { date: d.date, value: best };
  });
}

function cumulative(days: DayActivity[], step: (d: DayActivity) => number) {
  let total = 0;
  return days.map((d) => ({ date: d.date, value: (total += step(d)) }));
}

/** Builds every journey from activity sorted oldest first. Medicines only appear when doses were scheduled. */
export function buildJourneys(days: DayActivity[], currentStreak = 0): { journeys: Journey[]; wins: Win[]; daysShowingUp: number } {
  const sorted = [...days].sort((a, b) => a.date.localeCompare(b.date));
  const hasMeds = sorted.some((d) => d.dosesDue > 0);
  const journeys: Journey[] = [];
  const wins: Win[] = [];

  for (const def of DEFS) {
    if (def.key === "meds" && !hasMeds) continue;
    const series = def.key === "streak" ? streakRuns(sorted) : cumulative(sorted, def.step);
    const value = Math.round((series.at(-1)?.value ?? 0) * 10) / 10;
    const milestones: Milestone[] = [
      { at: 0, label: def.start, reachedOn: null },
      ...def.stops.map((s) => ({ ...s, reachedOn: series.find((p) => p.value >= s.at)?.date ?? null })),
    ];
    for (const m of milestones) if (m.reachedOn) wins.push({ journey: def.key, title: def.title, label: m.label, date: m.reachedOn });
    const next = milestones.find((m) => m.at > value);
    journeys.push({
      key: def.key,
      title: def.title,
      how: def.how,
      value,
      valueLabel: def.key === "streak" ? plural(value, "day") : def.amount(value),
      milestones,
      toGo: next ? def.amount(Math.ceil((next.at - value) * 10) / 10) : null,
      note: def.key === "streak" ? `Best run. Current streak: ${plural(currentStreak, "day")}.` : undefined,
    });
  }

  wins.sort((a, b) => b.date.localeCompare(a.date));
  return { journeys, wins, daysShowingUp: sorted.filter((d) => questsDone(d).length > 0).length };
}

/** How far along a road a value is, in stops: 2.5 means halfway between the third and fourth stop. */
export function position(milestones: Pick<Milestone, "at">[], value: number): number {
  for (let i = milestones.length - 1; i >= 0; i--) {
    if (value >= milestones[i].at) {
      const next = milestones[i + 1];
      return next ? i + (value - milestones[i].at) / (next.at - milestones[i].at) : i;
    }
  }
  return 0;
}

/** The journey whose next stop is nearest, measured as the share of the current leg still to go. */
export function closestWin(journeys: Journey[]): { journey: Journey; next: Milestone } | null {
  let best: { journey: Journey; next: Milestone; left: number } | null = null;
  for (const j of journeys) {
    const i = j.milestones.findIndex((m) => m.at > j.value);
    if (i < 1) continue;
    const next = j.milestones[i];
    const left = (next.at - j.value) / (next.at - j.milestones[i - 1].at);
    if (!best || left < best.left) best = { journey: j, next, left };
  }
  return best && { journey: best.journey, next: best.next };
}
