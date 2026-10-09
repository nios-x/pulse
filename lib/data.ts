import "server-only";
import { and, asc, desc, eq, gte, inArray, isNull, lte, ne, or, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  appointments,
  auditLog,
  doctors,
  doseLogs,
  invites,
  medications,
  notifications,
  records,
  shareLinks,
  users,
  vitals,
  type Member,
  type VitalKind,
} from "@/db/schema";
import { computeAlerts } from "@/lib/alerts";
import type { AppContext } from "@/lib/context";
import { addDays, fromIst, istDate, istTime } from "@/lib/dates";
import { adherence, doseState, scheduleFor, type DoseState } from "@/lib/meds";

export function nowIst() {
  const instant = new Date();
  return { instant, date: istDate(instant), time: istTime(instant) };
}

const ids = (list: { id: string }[]) => (list.length ? list.map((m) => m.id) : ["00000000-0000-0000-0000-000000000000"]);

/** Columns of a record without the encrypted file bytes. */
export const recordColumns = {
  id: records.id,
  memberId: records.memberId,
  type: records.type,
  title: records.title,
  recordDate: records.recordDate,
  provider: records.provider,
  notes: records.notes,
  fileName: records.fileName,
  mimeType: records.mimeType,
  sizeBytes: records.sizeBytes,
  extracted: records.extracted,
  createdAt: records.createdAt,
  createdBy: records.createdBy,
};

export type RecordRow = Awaited<ReturnType<typeof getRecords>>[number];

export async function getMeds(memberIds: string[], opts: { includeStopped?: boolean } = {}) {
  if (!memberIds.length) return [];
  return db
    .select()
    .from(medications)
    .where(and(inArray(medications.memberId, memberIds), opts.includeStopped ? undefined : eq(medications.active, true)))
    .orderBy(asc(medications.name));
}

export async function getDoseLogs(memberIds: string[], fromDate: string, toDate: string) {
  if (!memberIds.length) return [];
  return db
    .select()
    .from(doseLogs)
    .where(and(inArray(doseLogs.memberId, memberIds), gte(doseLogs.date, fromDate), lte(doseLogs.date, toDate)));
}

export type TodayDose = {
  key: string;
  medicationId: string;
  memberId: string;
  name: string;
  strength: string;
  instructions: string | null;
  time: string;
  date: string;
  slot: "morning" | "afternoon" | "night";
  state: DoseState;
  loggedAt: Date | null;
  loggedByName: string | null;
};

/** Today's checklist for the given members. */
export async function getTodayDoses(memberIds: string[]): Promise<TodayDose[]> {
  const now = nowIst();
  const meds = await getMeds(memberIds);
  const logs = await getDoseLogs(memberIds, now.date, now.date);
  const loggers = await userNames(logs.map((l) => l.loggedBy).filter(Boolean) as string[]);
  const byKey = new Map(logs.map((l) => [`${l.medicationId}|${l.time}`, l]));
  return scheduleFor(meds, now.date).map((dose) => {
    const log = byKey.get(`${dose.medication.id}|${dose.time}`);
    return {
      key: `${dose.medication.id}|${dose.date}|${dose.time}`,
      medicationId: dose.medication.id,
      memberId: dose.medication.memberId,
      name: dose.medication.name,
      strength: dose.medication.strength,
      instructions: dose.medication.instructions,
      time: dose.time,
      date: dose.date,
      slot: dose.slot,
      state: doseState(dose, log?.status, now),
      loggedAt: log?.loggedAt ?? null,
      loggedByName: log?.loggedBy ? loggers.get(log.loggedBy) ?? null : null,
    };
  });
}

async function userNames(userIds: string[]) {
  const unique = [...new Set(userIds)];
  if (!unique.length) return new Map<string, string>();
  const rows = await db.select({ id: users.id, name: users.name }).from(users).where(inArray(users.id, unique));
  return new Map(rows.map((r) => [r.id, r.name.split(" ")[0]]));
}

export async function getVitals(memberIds: string[], sinceDays = 90, kind?: VitalKind) {
  if (!memberIds.length) return [];
  const since = new Date(Date.now() - sinceDays * 86_400_000);
  return db
    .select()
    .from(vitals)
    .where(and(inArray(vitals.memberId, memberIds), gte(vitals.measuredAt, since), kind ? eq(vitals.kind, kind) : undefined))
    .orderBy(asc(vitals.measuredAt));
}

/** Latest reading per kind per member. */
export function latestByKind<T extends { memberId: string; kind: string; measuredAt: Date }>(rows: T[]) {
  const out = new Map<string, Map<string, T>>();
  for (const r of rows) {
    const m = out.get(r.memberId) ?? new Map<string, T>();
    const prev = m.get(r.kind);
    if (!prev || prev.measuredAt < r.measuredAt) m.set(r.kind, r);
    out.set(r.memberId, m);
  }
  return out;
}

export async function getAppointments(memberIds: string[], opts: { from?: Date; to?: Date; status?: "scheduled" } = {}) {
  if (!memberIds.length) return [];
  return db
    .select()
    .from(appointments)
    .where(
      and(
        inArray(appointments.memberId, memberIds),
        opts.from ? gte(appointments.startsAt, opts.from) : undefined,
        opts.to ? lte(appointments.startsAt, opts.to) : undefined,
        opts.status ? eq(appointments.status, opts.status) : undefined
      )
    )
    .orderBy(asc(appointments.startsAt));
}

export async function getRecords(memberIds: string[]) {
  if (!memberIds.length) return [];
  return db
    .select(recordColumns)
    .from(records)
    .where(inArray(records.memberId, memberIds))
    .orderBy(desc(records.recordDate), desc(records.createdAt));
}

export async function getDoctors() {
  return db.select().from(doctors).orderBy(asc(doctors.specialty));
}

/** Everything the family dashboard needs, in parallel. */
export async function getDashboard(ctx: AppContext) {
  const now = nowIst();
  const memberIds = ids(ctx.visibleMembers);
  const [meds, logs, vitalRows, upcoming, todayDoses] = await Promise.all([
    getMeds(memberIds),
    getDoseLogs(memberIds, addDays(now.date, -7), now.date),
    getVitals(memberIds, 60),
    getAppointments(memberIds, { from: new Date(now.instant.getTime() - 60 * 60_000), to: new Date(now.instant.getTime() + 21 * 86_400_000), status: "scheduled" }),
    getTodayDoses(memberIds),
  ]);
  const alerts = computeAlerts({ members: ctx.visibleMembers, meds, logs, vitals: vitalRows, now });
  const latest = latestByKind(vitalRows);
  const adherenceByMember = new Map(
    ctx.visibleMembers.map((m) => [m.id, adherence(meds.filter((x) => x.memberId === m.id), logs, now, 7)])
  );
  return { now, meds, todayDoses, vitals: vitalRows, latest, upcoming, alerts, adherenceByMember };
}

export async function getMemberOverview(member: Member) {
  const now = nowIst();
  const [meds, logs, vitalRows, appts, recs] = await Promise.all([
    getMeds([member.id], { includeStopped: true }),
    getDoseLogs([member.id], addDays(now.date, -30), now.date),
    getVitals([member.id], 180),
    getAppointments([member.id]),
    getRecords([member.id]),
  ]);
  const active = meds.filter((m) => m.active);
  const alerts = computeAlerts({ members: [member], meds: active, logs, vitals: vitalRows, now });
  return {
    now,
    meds,
    activeMeds: active,
    logs,
    vitals: vitalRows,
    latest: latestByKind(vitalRows).get(member.id) ?? new Map(),
    appointments: appts,
    records: recs,
    alerts,
    adherence7: adherence(active, logs, now, 7),
    adherence30: adherence(active, logs, now, 30),
  };
}

/** Day-by-day log for the last N days: what was taken, skipped or missed. */
export function doseHistory(
  meds: Awaited<ReturnType<typeof getMeds>>,
  logs: Awaited<ReturnType<typeof getDoseLogs>>,
  days: number,
  now = nowIst()
) {
  const byKey = new Map(logs.map((l) => [`${l.medicationId}|${l.date}|${l.time}`, l]));
  const out: { date: string; items: { medicationId: string; name: string; strength: string; time: string; state: DoseState; loggedAt: Date | null }[] }[] = [];
  for (let i = 0; i < days; i++) {
    const date = addDays(now.date, -i);
    const items = scheduleFor(meds, date).map((dose) => {
      const log = byKey.get(`${dose.medication.id}|${date}|${dose.time}`);
      return {
        medicationId: dose.medication.id,
        name: dose.medication.name,
        strength: dose.medication.strength,
        time: dose.time,
        state: doseState(dose, log?.status, now),
        loggedAt: log?.loggedAt ?? null,
      };
    });
    if (items.length) out.push({ date, items });
  }
  return out;
}

export async function getNotifications(familyId: string, limit = 20) {
  return db
    .select()
    .from(notifications)
    .where(eq(notifications.familyId, familyId))
    .orderBy(desc(notifications.createdAt))
    .limit(limit);
}

export async function getUnreadCount(familyId: string) {
  const [row] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(notifications)
    .where(and(eq(notifications.familyId, familyId), isNull(notifications.readAt), ne(notifications.kind, "digest")));
  return row?.n ?? 0;
}

export async function getShareLinks(familyId: string) {
  return db.select().from(shareLinks).where(eq(shareLinks.familyId, familyId)).orderBy(desc(shareLinks.createdAt));
}

export async function getInvites(familyId: string) {
  return db
    .select()
    .from(invites)
    .where(and(eq(invites.familyId, familyId), isNull(invites.usedAt), gte(invites.expiresAt, new Date())))
    .orderBy(desc(invites.createdAt));
}

export async function getAudit(familyId: string, limit = 30) {
  return db
    .select({ id: auditLog.id, action: auditLog.action, detail: auditLog.detail, createdAt: auditLog.createdAt, actor: users.name })
    .from(auditLog)
    .leftJoin(users, eq(auditLog.actorUserId, users.id))
    .where(eq(auditLog.familyId, familyId))
    .orderBy(desc(auditLog.createdAt))
    .limit(limit);
}

export async function getFamilyUsers(memberUserIds: string[]) {
  if (!memberUserIds.length) return new Map<string, { email: string }>();
  const rows = await db.select({ id: users.id, email: users.email }).from(users).where(inArray(users.id, memberUserIds));
  return new Map(rows.map((r) => [r.id, { email: r.email }]));
}

/** Booked slots for a doctor on a date, to grey them out. */
export async function bookedSlots(doctorId: string, date: string) {
  const from = fromIst(date, "00:00");
  const to = fromIst(date, "23:59");
  const rows = await db
    .select({ startsAt: appointments.startsAt })
    .from(appointments)
    .where(
      and(
        eq(appointments.doctorId, doctorId),
        gte(appointments.startsAt, from),
        lte(appointments.startsAt, to),
        or(eq(appointments.status, "scheduled"), eq(appointments.status, "completed"))
      )
    );
  return rows.map((r) => istTime(r.startsAt));
}
