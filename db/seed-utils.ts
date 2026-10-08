// Shared helpers for db/seed.ts (7 days) and db/demo-seed.ts (60 days).
// All data written here is synthetic.

import { inArray } from "drizzle-orm";
import { db } from "@/db";
import {
  dailyCheckins,
  glucoseReadings,
  meals,
  medications,
  medLogs,
  memberships,
  patients,
  users,
  type MealSlot,
  type Scope,
} from "@/db/schema";
import { hashPassword } from "@/lib/auth";
import { addDays, dateRange, istDate, istDateTime } from "@/lib/dates";
import type { FoodKey } from "@/lib/foods";

export const DEMO_PASSWORD = "demo1234";

export const DEMO_PEOPLE = {
  ramesh: { name: "Ramesh Sharma", email: "ramesh@pulse.demo", phone: "9800000001" },
  rahul: { name: "Rahul Sharma", email: "rahul@pulse.demo", phone: "9800000002" },
  maa: { name: "Sunita Sharma", email: "maa@pulse.demo", phone: "9800000003" },
  doctor: { name: "Dr. Anjali Verma", email: "doctor@pulse.demo", phone: "9800000004", isDoctor: true, clinic: "Verma Diabetes Clinic, Kanpur" },
} as const;

/** Small deterministic random generator, so every seed run looks the same. */
export function makeRandom(seed: number) {
  let a = seed >>> 0;
  const next = () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  return {
    next,
    int: (min: number, max: number) => Math.floor(next() * (max - min + 1)) + min,
    pick: <T>(items: readonly T[]) => items[Math.floor(next() * items.length)],
    chance: (p: number) => next() < p,
  };
}
export type Random = ReturnType<typeof makeRandom>;

/** Removes the demo users and every patient they belong to (rows cascade). */
export async function resetDemoFamily() {
  const emails = Object.values(DEMO_PEOPLE).map((p) => p.email);
  const existing = await db.select({ id: users.id }).from(users).where(inArray(users.email, emails));
  if (existing.length === 0) return;
  const ids = existing.map((u) => u.id);
  const owned = await db
    .select({ patientId: memberships.patientId })
    .from(memberships)
    .where(inArray(memberships.userId, ids));
  if (owned.length) {
    await db.delete(patients).where(
      inArray(
        patients.id,
        owned.map((m) => m.patientId)
      )
    );
  }
  await db.delete(users).where(inArray(users.id, ids));
}

export async function createDemoFamily(startDate: string) {
  const passwordHash = await hashPassword(DEMO_PASSWORD);
  const [ramesh, rahul, maa, doctor] = await db
    .insert(users)
    .values([
      { ...DEMO_PEOPLE.ramesh, passwordHash },
      { ...DEMO_PEOPLE.rahul, passwordHash },
      { ...DEMO_PEOPLE.maa, passwordHash },
      { ...DEMO_PEOPLE.doctor, passwordHash },
    ])
    .returning();

  const createdAt = istDateTime(startDate, "07:00");
  const [patient] = await db
    .insert(patients)
    .values({ name: "Ramesh Sharma", birthYear: 1964, city: "Kanpur", synthetic: true, createdBy: rahul.id, createdAt })
    .returning();

  const all: Scope[] = ["vitals", "meds", "meals", "mood"];
  await db.insert(memberships).values([
    { patientId: patient.id, userId: ramesh.id, role: "owner", scopes: all },
    { patientId: patient.id, userId: rahul.id, role: "caregiver", scopes: ["vitals", "meds", "meals"] },
    { patientId: patient.id, userId: maa.id, role: "family", scopes: ["meals"] },
    { patientId: patient.id, userId: doctor.id, role: "doctor", scopes: ["vitals", "meds", "meals"] },
  ]);

  const meds = await db
    .insert(medications)
    .values([
      { patientId: patient.id, loggedBy: rahul.id, name: "Metformin", dose: "500 mg", times: ["08:00", "20:00"], createdAt },
      { patientId: patient.id, loggedBy: rahul.id, name: "Glimepiride", dose: "1 mg", times: ["08:00"], createdAt },
      { patientId: patient.id, loggedBy: rahul.id, name: "Atorvastatin", dose: "10 mg", times: ["21:00"], createdAt },
    ])
    .returning();

  return { ramesh, rahul, maa, doctor, patient, meds };
}

type Family = Awaited<ReturnType<typeof createDemoFamily>>;

export type DayPlan = {
  dinner: "rice" | "roti";
  walked: boolean;
  /** Return true to leave this dose untaken. */
  missDose: (medName: string, slot: string) => boolean;
  /** Extra mg/dL added to this morning's fasting reading. */
  fastingShift?: number;
};

const BREAKFASTS: FoodKey[][] = [
  ["poha", "chai_sugar"],
  ["paratha", "curd"],
  ["roti", "sabzi", "chai_sugar"],
];
const LUNCHES: FoodKey[][] = [
  ["dal", "rice", "sabzi"],
  ["roti", "dal", "sabzi"],
  ["roti", "sabzi", "curd"],
];

/**
 * Writes `from`..`to` (India dates) of logs. Items timed after `now` are skipped,
 * so today's data stops at the current hour.
 */
export async function fillDays(
  family: Family,
  opts: { from: string; to: string; now: Date; rand: Random; plan: (date: string) => DayPlan }
) {
  const { patient, ramesh, rahul, meds } = family;
  const { rand, now } = opts;
  const readings: (typeof glucoseReadings.$inferInsert)[] = [];
  const mealRows: (typeof meals.$inferInsert)[] = [];
  const checkins: (typeof dailyCheckins.$inferInsert)[] = [];
  const doses: (typeof medLogs.$inferInsert)[] = [];
  const at = (date: string, time: string) => istDateTime(date, time);
  const past = (d: Date) => d.getTime() <= now.getTime();

  for (const date of dateRange(opts.from, opts.to)) {
    const plan = opts.plan(date);
    const yesterday = opts.plan(addDays(date, -1));

    // Morning fasting: lower after a day with a walk.
    const fastingAt = at(date, `07:${String(rand.int(10, 45)).padStart(2, "0")}`);
    const fasting =
      132 + (yesterday.walked ? -16 : 6) + (plan.fastingShift ?? 0) + rand.int(-8, 8);
    if (past(fastingAt)) {
      readings.push({
        patientId: patient.id,
        loggedBy: rand.chance(0.85) ? ramesh.id : rahul.id,
        mgdl: fasting,
        context: "fasting",
        measuredAt: fastingAt,
      });
    }

    const mealPlan: [MealSlot, string, FoodKey[]][] = [
      ["breakfast", "08:30", rand.pick(BREAKFASTS)],
      ["lunch", "13:30", rand.pick(LUNCHES)],
      ["dinner", "20:30", plan.dinner === "rice" ? ["rice", "dal", "sabzi"] : ["roti", "dal", "sabzi"]],
    ];
    for (const [slot, time, items] of mealPlan) {
      const eatenAt = at(date, time);
      if (!past(eatenAt)) continue;
      mealRows.push({
        patientId: patient.id,
        loggedBy: slot === "dinner" && rand.chance(0.3) ? family.maa.id : ramesh.id,
        slot,
        items,
        eatenAt,
      });
    }

    // After-dinner reading: rice dinners run clearly higher than roti dinners.
    const afterDinnerAt = at(date, "22:30");
    if (past(afterDinnerAt)) {
      readings.push({
        patientId: patient.id,
        loggedBy: ramesh.id,
        mgdl: (plan.dinner === "rice" ? 212 : 166) + rand.int(-12, 12),
        context: "after_meal",
        measuredAt: afterDinnerAt,
      });
    }

    if (past(at(date, "21:30"))) {
      checkins.push({
        patientId: patient.id,
        loggedBy: ramesh.id,
        date,
        walked: plan.walked,
        sleep: rand.pick([2, 3, 3, 2, 1]),
      });
    }

    for (const med of meds) {
      for (const slot of med.times) {
        const takenAt = new Date(at(date, slot).getTime() + rand.int(2, 40) * 60_000);
        if (!past(takenAt) || plan.missDose(med.name, slot)) continue;
        doses.push({
          patientId: patient.id,
          loggedBy: rand.chance(0.2) ? rahul.id : ramesh.id,
          medicationId: med.id,
          date,
          slot,
          takenAt,
        });
      }
    }
  }

  if (readings.length) await db.insert(glucoseReadings).values(readings);
  if (mealRows.length) await db.insert(meals).values(mealRows);
  if (checkins.length) await db.insert(dailyCheckins).values(checkins);
  if (doses.length) await db.insert(medLogs).values(doses);
  return { readings: readings.length, meals: mealRows.length, checkins: checkins.length, doses: doses.length };
}

export function todayIst(now = new Date()) {
  return istDate(now);
}
