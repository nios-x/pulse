// bun run db:seed — 3 users, 1 patient, 3 medicines and 7 days of synthetic logs.
// Every demo account uses the password "demo1234".

import { sql } from "@/db";
import { addDays } from "@/lib/dates";
import {
  createDemoFamily,
  DEMO_PASSWORD,
  DEMO_PEOPLE,
  fillDays,
  makeRandom,
  resetDemoFamily,
  todayIst,
} from "./seed-utils";

async function main() {
  const now = new Date();
  const today = todayIst(now);
  const from = addDays(today, -7);
  const rand = makeRandom(7);

  await resetDemoFamily();
  const family = await createDemoFamily(addDays(from, -1));

  // Alternate rice and roti dinners, walk every other day, miss one dose.
  const counts = await fillDays(family, {
    from,
    to: today,
    now,
    rand,
    plan: (date) => {
      const n = Number(date.slice(8, 10));
      return {
        dinner: n % 2 === 0 ? "rice" : "roti",
        walked: n % 2 === 1,
        missDose: (med, slot) => date === addDays(today, -2) && med === "Metformin" && slot === "20:00",
      };
    },
  });

  console.log("Seeded (synthetic data):", counts);
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
