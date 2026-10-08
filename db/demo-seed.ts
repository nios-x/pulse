// bun run db:demo-seed — 60 days of SYNTHETIC data for the live demo.
// Story: rice dinners clearly raise Papa's sugar, walks lower the next
// morning's fasting, a 5-day missed-dose streak this week pushes fasting up,
// one high reading two weeks ago, and two HbA1c results.

import { sql } from "@/db";
import { alerts, glucoseReadings, labResults, moodChecks } from "@/db/schema";
import { db } from "@/db";
import { addDays, istDateTime } from "@/lib/dates";
import { evaluateGlucose } from "@/lib/safety";
import {
  createDemoFamily,
  DEMO_PASSWORD,
  DEMO_PEOPLE,
  fillDays,
  makeRandom,
  resetDemoFamily,
  todayIst,
} from "./seed-utils";

const DAYS = 60;

async function main() {
  const now = new Date();
  const today = todayIst(now);
  const from = addDays(today, -(DAYS - 1));
  const rand = makeRandom(60);

  await resetDemoFamily();
  const family = await createDemoFamily(addDays(from, -1));
  const { patient, ramesh, rahul } = family;

  // Missed-dose streak: 2 to 6 days ago, evening Metformin (and some morning Glimepiride).
  const streak = new Set([2, 3, 4, 5, 6].map((d) => addDays(today, -d)));
  const glimepirideMissed = new Set([3, 4, 5].map((d) => addDays(today, -d)));
  const dinnerPlan = new Map<string, "rice" | "roti">();
  const walkPlan = new Map<string, boolean>();

  const counts = await fillDays(family, {
    from,
    to: today,
    now,
    rand,
    plan: (date) => {
      if (!dinnerPlan.has(date)) dinnerPlan.set(date, rand.chance(0.5) ? "rice" : "roti");
      if (!walkPlan.has(date)) walkPlan.set(date, rand.chance(0.55));
      const missedLastEvening = streak.has(addDays(date, -1));
      return {
        dinner: dinnerPlan.get(date)!,
        walked: walkPlan.get(date)!,
        missDose: (med, slot) =>
          (med === "Metformin" && slot === "20:00" && streak.has(date)) ||
          (med === "Glimepiride" && glimepirideMissed.has(date)) ||
          rand.chance(0.03),
        fastingShift: missedLastEvening ? 22 : 0,
      };
    },
  });

  // One high reading, 15 days ago, with its alert (already seen by Rahul).
  const highAt = istDateTime(addDays(today, -15), "18:10");
  const [high] = await db
    .insert(glucoseReadings)
    .values({ patientId: patient.id, loggedBy: ramesh.id, mgdl: 318, context: "random", measuredAt: highAt, note: "After a wedding" })
    .returning({ id: glucoseReadings.id, mgdl: glucoseReadings.mgdl });
  const result = evaluateGlucose(high.mgdl, patient)!;
  await db.insert(alerts).values({
    patientId: patient.id,
    loggedBy: ramesh.id,
    ...result,
    sourceId: high.id,
    ackBy: rahul.id,
    ackAt: new Date(highAt.getTime() + 20 * 60_000),
    createdAt: highAt,
  });

  // Two HbA1c results: before Pulse and last week.
  await db.insert(labResults).values([
    { patientId: patient.id, loggedBy: rahul.id, kind: "hba1c", value: 8.4, takenOn: addDays(today, -85) },
    { patientId: patient.id, loggedBy: rahul.id, kind: "hba1c", value: 7.6, takenOn: addDays(today, -6) },
  ]);

  // Weekly energy checks on Mondays (private to Ramesh unless he shares mood).
  const checks = [];
  for (let d = from; d <= today; d = addDays(d, 1)) {
    if (new Date(`${d}T00:00:00Z`).getUTCDay() !== 1) continue;
    const q1 = rand.int(0, 1);
    const q2 = rand.int(0, 1);
    checks.push({ patientId: patient.id, loggedBy: ramesh.id, q1, q2, score: q1 + q2, checkedAt: istDateTime(d, "09:30") });
  }
  if (checks.length) await db.insert(moodChecks).values(checks);

  console.log(`Demo seeded with SYNTHETIC data, ${DAYS} days:`, { ...counts, readings: counts.readings + 1, moodChecks: checks.length });
  console.log("Sign in with any of these, password:", DEMO_PASSWORD);
  for (const p of Object.values(DEMO_PEOPLE)) console.log(`  ${p.name.padEnd(16)} ${p.email}`);
}

main()
  .then(() => sql.end())
  .catch(async (err) => {
    console.error(err);
    await sql.end();
    process.exit(1);
  });
