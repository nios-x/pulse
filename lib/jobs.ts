import "server-only";
import { and, eq, gte, inArray, isNotNull, lte } from "drizzle-orm";
import { db } from "@/db";
import { appointments, doseLogs, families, medications, members, users, vitals } from "@/db/schema";
import { addDays, formatDateTime, formatTime, istDate, istTime, minutesOf } from "@/lib/dates";
import { appUrl, renderEmail, type EmailBlock } from "@/lib/email-templates";
import { firstName } from "@/lib/labels";
import { sendMail } from "@/lib/mailer";
import { adherence, doseState, MISSED_AFTER_MIN, refillStatus, scheduleFor } from "@/lib/meds";
import { notify } from "@/lib/notify";
import { inScope, type AccessContext } from "@/lib/permissions";
import { classify, formatReading, isAlarming, VITAL_META } from "@/lib/vitals";

export type JobReport = { families: number; dueReminders: number; missedAlerts: number; appointmentReminders: number; refillAlerts: number; emails: number };

/**
 * Runs every ~15 minutes (Vercel Cron, any scheduler, or LOCAL_CRON=1).
 * Safe to run more often: every notification has a dedupe key.
 */
export async function runReminderJob(now = new Date(), onlyFamilyId?: string): Promise<JobReport> {
  const today = istDate(now);
  const time = istTime(now);
  const report: JobReport = { families: 0, dueReminders: 0, missedAlerts: 0, appointmentReminders: 0, refillAlerts: 0, emails: 0 };
  const fams = await db.select().from(families).where(onlyFamilyId ? eq(families.id, onlyFamilyId) : undefined);

  for (const fam of fams) {
    report.families++;
    const people = await db.select().from(members).where(eq(members.familyId, fam.id));
    if (!people.length) continue;
    const ids = people.map((p) => p.id);
    const meds = await db.select().from(medications).where(and(inArray(medications.memberId, ids), eq(medications.active, true)));
    const logs = await db.select().from(doseLogs).where(and(inArray(doseLogs.memberId, ids), eq(doseLogs.date, today)));
    const logged = new Map(logs.map((l) => [`${l.medicationId}|${l.time}`, l.status]));

    for (const dose of scheduleFor(meds, today)) {
      const person = people.find((p) => p.id === dose.medication.memberId)!;
      const status = logged.get(`${dose.medication.id}|${dose.time}`);
      if (status) continue;
      const diff = minutesOf(time) - minutesOf(dose.time);
      const label = `${dose.medication.name} ${dose.medication.strength}`.trim();
      if (diff >= 0 && diff < 60) {
        const r = await notify({
          familyId: fam.id,
          memberId: person.id,
          kind: "dose_due",
          severity: "info",
          title: `Time for ${label}`,
          body: `${person.name} · ${formatTime(dose.time)}${dose.medication.instructions ? ` · ${dose.medication.instructions}` : ""}. Tap to mark it taken.`,
          href: "/medications",
          dedupeKey: `due-${dose.medication.id}-${today}-${dose.time}`,
          email: { recipients: person.userId ? "member" : "care-team" },
        });
        if (r.created) report.dueReminders++;
        report.emails += r.emailed;
      } else if (doseState(dose, null, { date: today, time }) === "missed" && diff < MISSED_AFTER_MIN + 6 * 60) {
        const r = await notify({
          familyId: fam.id,
          memberId: person.id,
          kind: "missed_dose",
          severity: "warning",
          title: `${firstName(person.name)} hasn't taken ${label}`,
          body: `The ${formatTime(dose.time)} dose isn't marked yet. A quick call might help.`,
          href: `/medications?member=${person.id}`,
          dedupeKey: `missed-${dose.medication.id}-${today}-${dose.time}`,
        });
        if (r.created) report.missedAlerts++;
        report.emails += r.emailed;
      }
    }

    // Refills, once a day per medicine
    for (const med of meds) {
      const r = refillStatus(med);
      if (r.status !== "soon" && r.status !== "out") continue;
      const person = people.find((p) => p.id === med.memberId)!;
      const res = await notify({
        familyId: fam.id,
        memberId: person.id,
        kind: "refill",
        severity: r.status === "out" ? "warning" : "info",
        title: r.status === "out" ? `${med.name} has run out` : `Refill ${med.name} soon`,
        body: `${person.name} · ${med.pillsLeft} left (about ${r.daysLeft} days).`,
        href: `/medications?member=${person.id}`,
        dedupeKey: `refill-${med.id}-${today}`,
      });
      if (res.created) report.refillAlerts++;
      report.emails += res.emailed;
    }

    // Appointments in the next 24 hours
    const soon = await db
      .select()
      .from(appointments)
      .where(and(inArray(appointments.memberId, ids), eq(appointments.status, "scheduled"), gte(appointments.startsAt, now), lte(appointments.startsAt, new Date(now.getTime() + 24 * 3_600_000))));
    for (const a of soon) {
      const person = people.find((p) => p.id === a.memberId)!;
      const res = await notify({
        familyId: fam.id,
        memberId: person.id,
        kind: "appointment",
        severity: "info",
        title: `${firstName(person.name)} sees ${a.doctorName} ${istDate(a.startsAt) === today ? "today" : "tomorrow"}`,
        body: `${formatDateTime(a.startsAt)} · ${a.mode === "video" ? "Video consult" : a.location ?? ""}${a.notes ? ` · ${a.notes}` : ""}`,
        href: "/appointments",
        dedupeKey: `appt-24h-${a.id}`,
      });
      if (res.created) report.appointmentReminders++;
      report.emails += res.emailed;
    }
  }
  return report;
}

/** Morning summary per user, respecting what their role lets them see. Runs once a day (7 am India time). */
export async function runDailyDigest(now = new Date(), onlyFamilyId?: string): Promise<{ sent: number }> {
  const today = istDate(now);
  const yesterday = addDays(today, -1);
  let sent = 0;
  const fams = await db.select().from(families).where(onlyFamilyId ? eq(families.id, onlyFamilyId) : undefined);
  for (const fam of fams) {
    const people = await db.select().from(members).where(eq(members.familyId, fam.id));
    const ids = people.map((p) => p.id);
    if (!ids.length) continue;
    const [meds, logs, appts, vit] = await Promise.all([
      db.select().from(medications).where(and(inArray(medications.memberId, ids), eq(medications.active, true))),
      db.select().from(doseLogs).where(and(inArray(doseLogs.memberId, ids), eq(doseLogs.date, yesterday))),
      db.select().from(appointments).where(and(inArray(appointments.memberId, ids), eq(appointments.status, "scheduled"), gte(appointments.startsAt, now), lte(appointments.startsAt, new Date(now.getTime() + 24 * 3_600_000)))),
      db.select().from(vitals).where(and(inArray(vitals.memberId, ids), gte(vitals.measuredAt, new Date(now.getTime() - 24 * 3_600_000)))),
    ]);
    const recipients = await db
      .select({ member: members, email: users.email, name: users.name, dailyDigest: users.dailyDigest })
      .from(members)
      .innerJoin(users, eq(members.userId, users.id))
      .where(and(eq(members.familyId, fam.id), isNotNull(members.userId)));

    for (const r of recipients) {
      if (!r.dailyDigest) continue;
      const access: AccessContext = { role: r.member.role, selfMemberId: r.member.id, assignedMemberIds: r.member.assignedMemberIds, overrides: fam.permissions };
      const visible = people.filter((p) => inScope(access, p.id));
      const rows = visible.map((p) => {
        const mine = meds.filter((m) => m.memberId === p.id);
        const a = adherence(mine, logs, { date: today, time: "00:00" }, 1);
        return { p, a, count: mine.length };
      }).filter((x) => x.count > 0);
      const alarming = vit.filter((v) => visible.some((p) => p.id === v.memberId) && isAlarming(v));
      const todays = appts.filter((a) => visible.some((p) => p.id === a.memberId));
      const refills = meds.filter((m) => visible.some((p) => p.id === m.memberId) && ["soon", "out"].includes(refillStatus(m).status));
      if (!rows.length && !todays.length && !alarming.length) continue;

      const blocks: EmailBlock[] = [
        { type: "p", text: `Good morning, ${firstName(r.name)}. Here's how the family did yesterday and what's coming up.` },
        {
          type: "list",
          title: "Yesterday's medicines",
          items: rows.map(({ p, a }) => ({
            label: p.name,
            meta: a.percent == null ? "—" : `${a.taken} of ${a.due} taken`,
            tone: a.percent == null ? undefined : a.percent === 100 ? ("success" as const) : a.percent >= 70 ? ("warning" as const) : ("danger" as const),
          })),
        },
      ];
      if (alarming.length) {
        blocks.push({
          type: "list",
          title: "Readings to look at",
          items: alarming.map((v) => ({ label: `${firstName(people.find((p) => p.id === v.memberId)!.name)} · ${VITAL_META[v.kind].label}`, meta: `${classify(v).label} · ${formatReading(v)} ${VITAL_META[v.kind].unit}`, tone: "danger" as const })),
        });
      }
      if (todays.length) {
        blocks.push({ type: "list", title: "Appointments today and tomorrow", items: todays.map((a) => ({ label: `${firstName(people.find((p) => p.id === a.memberId)!.name)} · ${a.doctorName}`, meta: formatDateTime(a.startsAt) })) });
      }
      if (refills.length) {
        blocks.push({ type: "list", title: "Refills due", items: refills.map((m) => ({ label: `${m.name} ${m.strength}`, meta: `${m.pillsLeft} left`, tone: "warning" as const })) });
      }
      blocks.push({ type: "button", text: "Open today's checklist", href: appUrl("/dashboard") });
      const { html, text } = renderEmail({ preheader: `Yesterday's medicines and today's plan for the ${fam.name}`, title: `${fam.name}: morning summary`, blocks });
      const dedupe = await notify({ familyId: fam.id, kind: "digest", severity: "info", title: "Morning summary sent", body: `Sent to ${r.name}`, dedupeKey: `digest-${r.member.id}-${today}`, email: { recipients: "none" } });
      if (!dedupe.created) continue;
      const res = await sendMail({ to: r.email, subject: `Morning summary · ${fam.name}`, html, text, kind: "digest" });
      if (res.status !== "failed") sent++;
    }
  }
  return { sent };
}
