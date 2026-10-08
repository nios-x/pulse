import { and, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { medications, medLogs, memberships, patients, pushSubscriptions, sentReminders } from "@/db/schema";
import { istDate, istMinutes } from "@/lib/dates";
import { formatSlot } from "@/lib/format";
import { createT, isLocale } from "@/lib/i18n";
import { can } from "@/lib/permissions";
import { sendPush } from "@/lib/push";
import { remindersDue } from "@/lib/reminders";

/**
 * One cron run (every 15 minutes): "Time for Metformin" to the patient at each
 * dose time, "Papa hasn't taken his 8 am dose" to caregivers an hour later.
 * Family members get the late nudge only if they hold the meds scope.
 */
export async function runReminderJob(now: Date) {
  const clock = { today: istDate(now), nowMinutes: istMinutes(now) };
  const meds = await db.select().from(medications).where(eq(medications.active, true));
  if (meds.length === 0) return { reminders: 0, sent: 0, gone: 0, failed: 0 };

  const logs = await db
    .select({ medicationId: medLogs.medicationId, date: medLogs.date, slot: medLogs.slot })
    .from(medLogs)
    .where(eq(medLogs.date, clock.today));
  const candidates = remindersDue(meds, logs, clock);

  // Claim each reminder first; a reminder another run already sent is skipped.
  const fresh = [];
  for (const r of candidates) {
    const [claimed] = await db.insert(sentReminders).values(r).onConflictDoNothing().returning({ id: sentReminders.id });
    if (claimed) fresh.push(r);
  }
  if (fresh.length === 0) return { reminders: 0, sent: 0, gone: 0, failed: 0 };

  const medById = new Map(meds.map((m) => [m.id, m]));
  const patientIds = [...new Set(fresh.map((r) => medById.get(r.medicationId)!.patientId))];
  const [patientRows, members, subs] = await Promise.all([
    db.select().from(patients).where(inArray(patients.id, patientIds)),
    db.select().from(memberships).where(inArray(memberships.patientId, patientIds)),
    db
      .select({ userId: pushSubscriptions.userId, endpoint: pushSubscriptions.endpoint, keys: pushSubscriptions.keys, locale: pushSubscriptions.locale })
      .from(pushSubscriptions)
      .innerJoin(memberships, and(eq(memberships.userId, pushSubscriptions.userId), inArray(memberships.patientId, patientIds))),
  ]);
  const patientById = new Map(patientRows.map((p) => [p.id, p]));

  const tally = { reminders: fresh.length, sent: 0, gone: 0, failed: 0 };
  for (const r of fresh) {
    const med = medById.get(r.medicationId)!;
    const patient = patientById.get(med.patientId)!;
    const team = members.filter((m) => m.patientId === patient.id);
    const ctx = { patientHasOwner: team.some((m) => m.role === "owner") };
    const recipients = team.filter((m) =>
      r.kind === "due" ? m.role === "owner" : m.role !== "owner" && can(m, "view_meds", ctx)
    );
    for (const m of recipients) {
      for (const sub of subs.filter((s) => s.userId === m.userId)) {
        const locale = isLocale(sub.locale) ? sub.locale : "hi";
        const t = createT(locale);
        const vars = { med: `${med.name} ${med.dose}`.trim(), time: formatSlot(r.slot, locale), name: patient.name };
        const result = await sendPush(sub, {
          title: t(r.kind === "due" ? "push.dueTitle" : "push.lateTitle", vars),
          body: t(r.kind === "due" ? "push.dueBody" : "push.lateBody", vars),
          url: `/home?p=${patient.id}#due`,
          tag: `${r.kind}-${med.id}-${r.date}-${r.slot}`,
        });
        tally[result === "sent" ? "sent" : result]++;
      }
    }
  }
  return tally;
}
