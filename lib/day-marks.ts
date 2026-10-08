// Rule-based marks for the home calendar. Pure. Rules run top to bottom and the
// first match wins, so one bad reading outranks a missed dose, which outranks a
// good day. Every mark carries the reasons that produced it, shown in words.

import type { Patient } from "@/db/schema";
import { addDays, dateRange, istDate, weekday } from "@/lib/dates";
import type { ReadingIn } from "@/lib/insights";
import { glucoseStatus } from "@/lib/vitals";

export type DayMark = "alert" | "watch" | "good" | "empty" | "future";

export type DayReason =
  | { kind: "low" | "high"; mgdl: number }
  | { kind: "aboveTarget" | "missed" | "inRange" | "taken"; count: number }
  | { kind: "walked" };

export type DayInput = {
  readings: readonly ReadingIn[];
  /** Null when the viewer can't see medicines. */
  doses: { taken: number; missed: number } | null;
  walked: boolean;
};

export type MarkedDay = { date: string; mark: DayMark; reasons: DayReason[]; walked: boolean };

type Limits = Pick<Patient, "glucoseLow" | "glucoseHigh">;

/** The rules. `date` after `today` is always "future". */
export function markDay(date: string, today: string, input: DayInput, limits: Limits): MarkedDay {
  const { readings, doses, walked } = input;
  const walkReason: DayReason[] = walked ? [{ kind: "walked" }] : [];
  if (date > today) return { date, mark: "future", reasons: [], walked: false };

  const tones = readings.map((r) => ({ mgdl: r.mgdl, ...glucoseStatus(r.mgdl, r.context, limits) }));
  const lows = tones.filter((r) => r.label === "low");
  const highs = tones.filter((r) => r.tone === "alert" && r.label === "high");
  const above = tones.filter((r) => r.tone === "watch").length;
  const inRange = tones.filter((r) => r.tone === "ok").length;
  const missed = doses?.missed ?? 0;
  const taken = doses?.taken ?? 0;

  // Rule 1: any reading low or high -> the day is red, lowest and highest named.
  if (lows.length > 0 || highs.length > 0) {
    const reasons: DayReason[] = [];
    if (lows.length > 0) reasons.push({ kind: "low", mgdl: Math.min(...lows.map((r) => r.mgdl)) });
    if (highs.length > 0) reasons.push({ kind: "high", mgdl: Math.max(...highs.map((r) => r.mgdl)) });
    if (missed > 0) reasons.push({ kind: "missed", count: missed });
    return { date, mark: "alert", reasons: [...reasons, ...walkReason], walked };
  }

  // Rule 2: a missed dose or a reading above target -> worth a look.
  if (missed > 0 || above > 0) {
    const reasons: DayReason[] = [];
    if (missed > 0) reasons.push({ kind: "missed", count: missed });
    if (above > 0) reasons.push({ kind: "aboveTarget", count: above });
    return { date, mark: "watch", reasons: [...reasons, ...walkReason], walked };
  }

  // Rule 3: something logged and nothing above went wrong -> a good day.
  if (inRange > 0 || taken > 0) {
    const reasons: DayReason[] = [];
    if (inRange > 0) reasons.push({ kind: "inRange", count: inRange });
    if (taken > 0) reasons.push({ kind: "taken", count: taken });
    return { date, mark: "good", reasons: [...reasons, ...walkReason], walked };
  }

  // Rule 4: nothing to judge. A walk alone doesn't make a good day.
  return { date, mark: "empty", reasons: walkReason, walked };
}

/** "YYYY-MM" for a "YYYY-MM-DD" date. */
export const monthOf = (date: string) => date.slice(0, 7);

/** Shift a "YYYY-MM" month by whole months. */
export function addMonths(month: string, n: number): string {
  const [y, m] = month.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 1 + n, 1));
  return d.toISOString().slice(0, 7);
}

/** First and last date of a "YYYY-MM" month. */
export function monthBounds(month: string): { from: string; to: string } {
  return { from: `${month}-01`, to: addDays(`${addMonths(month, 1)}-01`, -1) };
}

/** A valid "YYYY-MM" no later than `today`'s month, else `today`'s month. */
export function parseMonth(value: unknown, today: string): string {
  const current = monthOf(today);
  if (typeof value !== "string" || !/^\d{4}-(0[1-9]|1[0-2])$/.test(value)) return current;
  return value > current ? current : value;
}

/**
 * Marks for every day of `month`, grouped into Sunday-first weeks with null
 * padding, ready to lay out as a grid.
 */
export function markMonth(
  month: string,
  today: string,
  inputs: { readings: readonly ReadingIn[]; doses: (date: string) => DayInput["doses"]; walkedDates: ReadonlySet<string> },
  limits: Limits
): { weeks: (MarkedDay | null)[][]; days: MarkedDay[] } {
  const { from, to } = monthBounds(month);
  const byDate = new Map<string, ReadingIn[]>();
  for (const r of inputs.readings) {
    const d = istDate(r.measuredAt);
    byDate.set(d, [...(byDate.get(d) ?? []), r]);
  }
  const days = dateRange(from, to).map((date) =>
    markDay(
      date,
      today,
      {
        readings: byDate.get(date) ?? [],
        doses: date > today ? null : inputs.doses(date),
        walked: inputs.walkedDates.has(date),
      },
      limits
    )
  );
  const cells: (MarkedDay | null)[] = [...Array(weekday(from)).fill(null), ...days];
  while (cells.length % 7 !== 0) cells.push(null);
  const weeks = Array.from({ length: cells.length / 7 }, (_, i) => cells.slice(i * 7, i * 7 + 7));
  return { weeks, days };
}
