/**
 * Resets the database to the demo family. Run: bun run db:seed
 * Every row comes from lib/mock-data.ts; record files are encrypted like real uploads.
 */
import { sql as dsql } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { db, sql } from "./index";
import * as s from "./schema";
import { buildMockData, DEMO_PASSWORD } from "../lib/mock-data";
import { encrypt } from "../lib/crypto";

export async function seed() {
  const data = buildMockData();
  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);

  await db.execute(dsql`TRUNCATE TABLE audit_log, email_log, notifications, triage_sessions, share_links, records,
    appointments, doctors, vitals, dose_logs, medications, invites, members, families, sessions, users RESTART IDENTITY CASCADE`);

  await db.insert(s.users).values(data.users.map((u) => ({ ...u, passwordHash })));
  await db.insert(s.families).values(data.family);
  await db.insert(s.members).values(data.members);
  await db.insert(s.medications).values(data.medications);
  for (let i = 0; i < data.doseLogs.length; i += 500) {
    await db.insert(s.doseLogs).values(data.doseLogs.slice(i, i + 500));
  }
  await db.insert(s.vitals).values(data.vitals);
  await db.insert(s.doctors).values(data.doctors);
  await db.insert(s.appointments).values(data.appointments);
  await db.insert(s.records).values(
    data.records.map(({ file, ...r }) => {
      const bytes = file ? Buffer.from(file.svg, "utf8") : null;
      return { ...r, sizeBytes: bytes?.length ?? null, fileData: bytes ? encrypt(bytes) : null };
    })
  );
  await db.insert(s.shareLinks).values(data.shareLinks);
  await db.insert(s.triageSessions).values(data.triageSessions);
  await db.insert(s.notifications).values(data.notifications);
  await db.insert(s.auditLog).values([
    { familyId: data.family.id!, actorUserId: data.users[0].id, action: "family.created", detail: { name: data.family.name } },
    { familyId: data.family.id!, actorUserId: data.users[0].id, action: "share.created", detail: { member: "Suresh Mehta", scope: "summary", label: "For Dr. Farah Khan" } },
  ]);

  return {
    members: data.members.length,
    medications: data.medications.length,
    doses: data.doseLogs.length,
    vitals: data.vitals.length,
    records: data.records.length,
  };
}

if (process.argv[1]?.endsWith("seed.ts")) {
  seed()
    .then((counts) => {
      console.log("Seeded the Mehta family:", counts);
      console.log("Sign in as rahul@pulse.demo / demo1234 (also priya@, suresh@, kamala@)");
    })
    .catch((err) => {
      console.error(err);
      process.exitCode = 1;
    })
    .finally(() => sql.end());
}
