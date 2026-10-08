// Pure dose bookkeeping. A missed dose is a scheduled slot with no med_logs row
// once its day is over; nothing is stored for it.

import { addDays, dateRange, istDate, timeToMinutes } from "@/lib/dates";

export type DoseStatus = "taken" | "missed" | "due" | "upcoming";

/** A dose shows under "Due now" from this many minutes before its time. */
export const DUE_EARLY_MINUTES = 60;

export type MedLike = { id: string; times: readonly string[]; active: boolean; createdAt: Date };
export type DoseLogLike = { medicationId: string; date: string; slot: string };

export type Clock = { today: string; nowMinutes: number };

const key = (medicationId: string, date: string, slot: string) => `${medicationId}|${date}|${slot}`;

export function takenSet(logs: readonly DoseLogLike[]): Set<string> {
  return new Set(logs.map((l) => key(l.medicationId, l.date, l.slot)));
}

/**
 * Was this slot scheduled at all? Counting starts on the day the medicine was
 * added, so a dose earlier that same day can still be ticked.
 */
export function isScheduled(med: MedLike, date: string): boolean {
  return date >= istDate(med.createdAt);
}

export function doseStatus(args: {
  date: string;
  slot: string;
  taken: boolean;
  clock: Clock;
}): DoseStatus {
  const { date, slot, taken, clock } = args;
  if (taken) return "taken";
  if (date < clock.today) return "missed"; // not ticked by the end of its day
  if (date > clock.today) return "upcoming";
  return timeToMinutes(slot) - DUE_EARLY_MINUTES <= clock.nowMinutes ? "due" : "upcoming";
}

export type GridCell = { date: string; slot: string; status: DoseStatus | "none" };

/** One row per slot, one cell per day; "none" where the medicine didn't exist yet. */
export function doseGrid(
  med: MedLike,
  logs: readonly DoseLogLike[],
  days: readonly string[],
  clock: Clock
): { slot: string; cells: GridCell[] }[] {
  const taken = takenSet(logs);
  return [...med.times].sort().map((slot) => ({
    slot,
    cells: days.map((date) => ({
      date,
      slot,
      status: isScheduled(med, date)
        ? doseStatus({ date, slot, taken: taken.has(key(med.id, date, slot)), clock })
        : "none",
    })),
  }));
}

/**
 * Taken / (taken + missed) over the date range. Doses still due today
 * don't count against the patient until the day ends.
 */
export function adherence(
  meds: readonly MedLike[],
  logs: readonly DoseLogLike[],
  from: string,
  to: string,
  clock: Clock
): { taken: number; missed: number; percent: number | null } {
  const taken = takenSet(logs);
  let t = 0;
  let m = 0;
  for (const med of meds) {
    for (const date of dateRange(from, to)) {
      for (const slot of med.times) {
        if (!isScheduled(med, date)) continue;
        const status = doseStatus({ date, slot, taken: taken.has(key(med.id, date, slot)), clock });
        if (status === "taken") t++;
        else if (status === "missed") m++;
      }
    }
  }
  return { taken: t, missed: m, percent: t + m === 0 ? null : Math.round((100 * t) / (t + m)) };
}

export type DueDose = { medicationId: string; date: string; slot: string; taken: boolean };

/** Today's doses whose time has come (or is within the hour), taken or not. */
export function dueToday(meds: readonly MedLike[], logs: readonly DoseLogLike[], clock: Clock): DueDose[] {
  const taken = takenSet(logs);
  const out: DueDose[] = [];
  for (const med of meds) {
    if (!med.active) continue;
    for (const slot of med.times) {
      if (!isScheduled(med, clock.today)) continue;
      if (timeToMinutes(slot) - DUE_EARLY_MINUTES > clock.nowMinutes) continue;
      out.push({ medicationId: med.id, date: clock.today, slot, taken: taken.has(key(med.id, clock.today, slot)) });
    }
  }
  return out.sort((a, b) => a.slot.localeCompare(b.slot));
}

/**
 * Doses missed since yesterday: all of yesterday's untaken slots plus today's
 * slots more than `graceMinutes` overdue. Feeds the missed-dose safety rule.
 */
export function missedSinceYesterday(
  meds: readonly MedLike[],
  logs: readonly DoseLogLike[],
  clock: Clock,
  graceMinutes = 120
): number {
  const taken = takenSet(logs);
  const yesterday = addDays(clock.today, -1);
  let count = 0;
  for (const med of meds) {
    if (!med.active) continue;
    for (const slot of med.times) {
      if (isScheduled(med, yesterday) && !taken.has(key(med.id, yesterday, slot))) count++;
      if (
        isScheduled(med, clock.today) &&
        timeToMinutes(slot) + graceMinutes <= clock.nowMinutes &&
        !taken.has(key(med.id, clock.today, slot))
      ) {
        count++;
      }
    }
  }
  return count;
}
