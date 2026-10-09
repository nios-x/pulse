import type { DoseStatus } from "@/db/schema";
import { addDays, minutesOf } from "@/lib/dates";

/** Doses become "due" an hour before their time and "missed" two hours after. */
export const DUE_BEFORE_MIN = 60;
export const MISSED_AFTER_MIN = 120;

export type DaySlot = "morning" | "afternoon" | "night";

export const SLOT_LABEL: Record<DaySlot, string> = {
  morning: "Morning",
  afternoon: "Afternoon",
  night: "Night",
};

export const SLOT_HINT: Record<DaySlot, string> = {
  morning: "Before noon",
  afternoon: "Noon to 5 pm",
  night: "After 5 pm",
};

export function slotOf(time: string): DaySlot {
  const m = minutesOf(time);
  if (m < 12 * 60) return "morning";
  if (m < 17 * 60) return "afternoon";
  return "night";
}

export type MedLike = {
  id: string;
  memberId: string;
  times: string[];
  startDate: string;
  endDate: string | null;
  active: boolean;
};

export type ScheduledDose<M extends MedLike = MedLike> = {
  medication: M;
  date: string;
  time: string;
  slot: DaySlot;
};

export function isScheduledOn(med: MedLike, date: string): boolean {
  if (!med.active) return false;
  if (date < med.startDate) return false;
  if (med.endDate && date > med.endDate) return false;
  return true;
}

/** Every dose due on `date`, sorted by time. */
export function scheduleFor<M extends MedLike>(meds: M[], date: string): ScheduledDose<M>[] {
  const out: ScheduledDose<M>[] = [];
  for (const med of meds) {
    if (!isScheduledOn(med, date)) continue;
    for (const time of [...new Set(med.times)].sort()) {
      out.push({ medication: med, date, time, slot: slotOf(time) });
    }
  }
  return out.sort((a, b) => a.time.localeCompare(b.time));
}

export type DoseState = "taken" | "skipped" | "missed" | "due" | "upcoming";

/** State of one scheduled dose, given its log (if any) and the current India date and time. */
export function doseState(
  dose: { date: string; time: string },
  logStatus: DoseStatus | null | undefined,
  now: { date: string; time: string }
): DoseState {
  if (logStatus === "taken") return "taken";
  if (logStatus === "skipped") return "skipped";
  if (logStatus === "missed") return "missed";
  if (dose.date < now.date) return "missed";
  if (dose.date > now.date) return "upcoming";
  const diff = minutesOf(now.time) - minutesOf(dose.time);
  if (diff > MISSED_AFTER_MIN) return "missed";
  if (diff >= -DUE_BEFORE_MIN) return "due";
  return "upcoming";
}

export function groupBySlot<T extends { slot: DaySlot }>(doses: T[]): Record<DaySlot, T[]> {
  const groups: Record<DaySlot, T[]> = { morning: [], afternoon: [], night: [] };
  for (const d of doses) groups[d.slot].push(d);
  return groups;
}

export type RefillStatus = "ok" | "soon" | "out" | "unknown";

export function refillStatus(med: { pillsLeft: number | null; refillAt: number; times: string[] }): {
  status: RefillStatus;
  daysLeft: number | null;
} {
  if (med.pillsLeft == null) return { status: "unknown", daysLeft: null };
  const perDay = Math.max(1, med.times.length);
  const daysLeft = Math.floor(med.pillsLeft / perDay);
  if (med.pillsLeft <= 0) return { status: "out", daysLeft: 0 };
  if (med.pillsLeft <= med.refillAt) return { status: "soon", daysLeft };
  return { status: "ok", daysLeft };
}

/**
 * Share of past doses that were taken, over the `days` days ending `today`.
 * Future doses of today are ignored, so the morning doesn't drag the score down.
 */
export function adherence(
  meds: MedLike[],
  logs: { medicationId: string; date: string; time: string; status: DoseStatus }[],
  now: { date: string; time: string },
  days = 7
): { taken: number; due: number; percent: number | null } {
  const byKey = new Map(logs.map((l) => [`${l.medicationId}|${l.date}|${l.time}`, l.status]));
  let taken = 0;
  let due = 0;
  for (let i = days - 1; i >= 0; i--) {
    const date = addDays(now.date, -i);
    for (const dose of scheduleFor(meds, date)) {
      const status = byKey.get(`${dose.medication.id}|${date}|${dose.time}`);
      const state = doseState(dose, status, now);
      if (state === "upcoming" || state === "due") continue;
      due += 1;
      if (state === "taken") taken += 1;
    }
  }
  return { taken, due, percent: due === 0 ? null : Math.round((taken / due) * 100) };
}

/** "Twice a day", "Every night" etc. from a list of times. */
export function frequencyLabel(times: string[]): string {
  const n = times.length;
  if (n === 1) {
    const slot = slotOf(times[0]);
    return slot === "morning" ? "Once every morning" : slot === "afternoon" ? "Once every afternoon" : "Once every night";
  }
  if (n === 2) return "Twice a day";
  if (n === 3) return "Three times a day";
  return `${n} times a day`;
}

/** Common schedule presets for the medicine form. */
export const SCHEDULE_PRESETS: { key: string; label: string; times: string[] }[] = [
  { key: "od-am", label: "Once · morning", times: ["08:00"] },
  { key: "od-pm", label: "Once · night", times: ["21:00"] },
  { key: "bd", label: "Twice · morning & night", times: ["08:00", "20:00"] },
  { key: "tds", label: "Three times", times: ["08:00", "14:00", "20:00"] },
];
