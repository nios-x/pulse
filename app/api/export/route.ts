import { inArray } from "drizzle-orm";
import { db } from "@/db";
import { appointments, doseLogs, medications, triageSessions, vitals } from "@/db/schema";
import { allowed, getContext } from "@/lib/context";
import { getRecords } from "@/lib/data";
import { audit } from "@/lib/audit";

/** Data portability: everything the family stored, as JSON (record files stay encrypted on the server). */
export async function GET() {
  const ctx = await getContext();
  if (!allowed(ctx, "family.manage")) return new Response("Only the family admin can export data.", { status: 403 });
  const ids = ctx.members.map((m) => m.id);
  const [meds, logs, vit, appts, recs, triage] = await Promise.all([
    db.select().from(medications).where(inArray(medications.memberId, ids)),
    db.select().from(doseLogs).where(inArray(doseLogs.memberId, ids)),
    db.select().from(vitals).where(inArray(vitals.memberId, ids)),
    db.select().from(appointments).where(inArray(appointments.memberId, ids)),
    getRecords(ids),
    db.select().from(triageSessions).where(inArray(triageSessions.memberId, ids)),
  ]);
  await audit(ctx.family.id, ctx.user.id, "family.exported", {});
  const body = JSON.stringify({ exportedAt: new Date().toISOString(), family: { name: ctx.family.name, city: ctx.family.city }, members: ctx.members, medications: meds, doseLogs: logs, vitals: vit, appointments: appts, records: recs, triageSessions: triage }, null, 2);
  return new Response(body, {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="pulse-${ctx.family.name.toLowerCase().replace(/\W+/g, "-")}-export.json"`,
      "Cache-Control": "no-store",
    },
  });
}
