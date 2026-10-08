// Plain-language reading labels. Pure. These describe a number against common
// home-monitoring targets; they are not a diagnosis, and every screen that shows
// one also shows the "Not a diagnosis" note.

import type { GlucoseContext } from "@/db/schema";

export type Tone = "ok" | "watch" | "alert" | "neutral";
export type VitalLabel = "low" | "inRange" | "aboveTarget" | "high" | "normal" | "slightlyHigh" | "veryHigh";
export type VitalStatus = { tone: Tone; label: VitalLabel };

/** Usual home targets (mg/dL). The patient's own high limit still wins for "High". */
export const GLUCOSE_TARGET = { fasting: [80, 130], after_meal: [80, 180], random: [80, 180] } as const;

export function glucoseStatus(
  mgdl: number,
  context: GlucoseContext,
  limits: { glucoseLow: number; glucoseHigh: number }
): VitalStatus {
  if (mgdl < limits.glucoseLow) return { tone: "alert", label: "low" };
  if (mgdl >= limits.glucoseHigh) return { tone: "alert", label: "high" };
  const [, top] = GLUCOSE_TARGET[context];
  if (mgdl > top + 70) return { tone: "alert", label: "high" };
  if (mgdl > top) return { tone: "watch", label: "aboveTarget" };
  return { tone: "ok", label: "inRange" };
}

/** Blood pressure in the bands most home monitors print. */
export function bpStatus(systolic: number, diastolic: number): VitalStatus {
  if (systolic >= 180 || diastolic >= 120) return { tone: "alert", label: "veryHigh" };
  if (systolic >= 140 || diastolic >= 90) return { tone: "alert", label: "high" };
  if (systolic < 90 || diastolic < 60) return { tone: "watch", label: "low" };
  if (systolic >= 120 || diastolic >= 80) return { tone: "watch", label: "slightlyHigh" };
  return { tone: "ok", label: "normal" };
}

/** Normal-range bands for the charts. */
export const BP_BAND = { systolic: [90, 120], diastolic: [60, 80] } as const;

/** Whole years old in `year`, or null without a birth year. */
export function ageIn(birthYear: number | null, today: string): number | null {
  if (!birthYear) return null;
  return Number(today.slice(0, 4)) - birthYear;
}

/** Days of tablets left, and how urgent a refill is. */
export function refillStatus(pillsLeft: number, perDay: number): { days: number; tone: Tone } {
  const days = perDay > 0 ? Math.floor(pillsLeft / perDay) : Infinity;
  return { days, tone: days <= 3 ? "alert" : days <= 7 ? "watch" : "ok" };
}
