import { cache } from "react";
import { and, desc, eq, gte, inArray } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { db } from "@/db";
import { callBookings, glucoseReadings, users, type GlucoseContext, type Role } from "@/db/schema";
import { doseStatus, isScheduled, takenSet, type DoseStatus } from "@/lib/adherence";
import { countUnread } from "@/lib/alerts";
import { requireUser } from "@/lib/auth";
import { istDate, istMinutes, timeToMinutes } from "@/lib/dates";
import { loadMeds } from "@/lib/meds";
import { demoProfile, type DemoProfile } from "@/lib/mock-data";
import { now } from "@/lib/now";
import { listMyPatients } from "@/lib/patients";
import { getAccess, type PermissionMap } from "@/lib/permissions";
import { APP_ROLE_OF, previewPermissions, type AppRole } from "@/lib/roles";
import { getPreview } from "@/lib/view-as";
import { ageIn, bpStatus, glucoseStatus, refillStatus, type VitalStatus } from "@/lib/vitals";

export type Dose = {
  patientId: string;
  medicationId: string;
  name: string;
  dose: string;
  slot: string;
  status: DoseStatus;
  /** Due more than an hour ago and still not ticked. */
  late: boolean;
};

export type Daypart = "morning" | "afternoon" | "night";
export function daypartOf(slot: string): Daypart {
  const m = timeToMinutes(slot);
  if (m < 12 * 60) return "morning";
  if (m < 17 * 60) return "afternoon";
  return "night";
}

export type FamilyMember = {
  id: string;
  name: string;
  firstName: string;
  age: number | null;
  city: string | null;
  synthetic: boolean;
  role: Role;
  appRole: AppRole;
  can: PermissionMap;
  demo: DemoProfile | null;
  sugar: { mgdl: number; context: GlucoseContext; at: Date; status: VitalStatus } | null;
  bp: { systolic: number; diastolic: number; on: string; status: VitalStatus } | null;
  doses: Dose[];
  unread: number;
  index: number;
};

export type Notice =
  | { kind: "late_dose"; patientId: string; name: string; med: string; slot: string }
  | { kind: "bp"; patientId: string; name: string; systolic: number; diastolic: number; status: VitalStatus }
  | { kind: "sugar"; patientId: string; name: string; mgdl: number; status: VitalStatus }
  | { kind: "alerts"; patientId: string; name: string; count: number }
  | { kind: "refill"; patientId: string; name: string; med: string; days: number };

export type Upcoming = {
  id: string;
  patientId: string;
  name: string;
  title: string;
  who: string;
  place: string;
  on: string;
  time: string;
  kind: "clinic" | "lab" | "vaccination" | "video";
};

const firstName = (name: string) => name.split(" ")[0];

/** Everyone the signed-in user can see, with today's snapshot for each. One call per request. */
export const loadFamily = cache(async () => {
  const user = await requireUser();
  const current = await now();
  const today = istDate(current);
  const clock = { today, nowMinutes: istMinutes(current) };
  const { viewAs, matrix } = await getPreview();
  const mine = await listMyPatients(user.id);

  const members = (
    await Promise.all(
      mine.map(async (row, index): Promise<FamilyMember | null> => {
        const access = await getAccess(row.id);
        if (!access) return null;
        const can = viewAs
          ? previewPermissions(access.permissions, viewAs, matrix, access.membership.role)
          : access.permissions;
        const p = access.patient;
        const [lastSugar, meds, unread] = await Promise.all([
          can.view_vitals
            ? db
                .select({ mgdl: glucoseReadings.mgdl, context: glucoseReadings.context, at: glucoseReadings.measuredAt })
                .from(glucoseReadings)
                .where(eq(glucoseReadings.patientId, p.id))
                .orderBy(desc(glucoseReadings.measuredAt))
                .limit(1)
            : [],
          can.view_meds || can.mark_dose ? loadMeds(p.id, today) : null,
          can.receive_alerts ? countUnread(p.id, access.membership.role) : 0,
        ]);
        const demo = demoProfile(p, today);
        const bpRow = demo?.vitals.filter((v) => v.kind === "bp").sort((a, b) => b.measuredOn.localeCompare(a.measuredOn))[0];
        const taken = meds ? takenSet(meds.logs) : new Set<string>();
        const doses: Dose[] = (meds?.meds ?? [])
          .filter((m) => isScheduled(m, today))
          .flatMap((m) =>
            m.times.map((slot) => {
              const status = doseStatus({ date: today, slot, taken: taken.has(`${m.id}|${today}|${slot}`), clock });
              return {
                patientId: p.id,
                medicationId: m.id,
                name: m.name,
                dose: m.dose,
                slot,
                status,
                late: status === "due" && timeToMinutes(slot) + 60 < clock.nowMinutes,
              };
            })
          )
          .sort((a, b) => a.slot.localeCompare(b.slot));
        const s = lastSugar[0];
        return {
          id: p.id,
          name: p.name,
          firstName: firstName(p.name),
          age: ageIn(p.birthYear, today),
          city: p.city,
          synthetic: p.synthetic,
          role: access.membership.role,
          appRole: APP_ROLE_OF[access.membership.role],
          can,
          demo,
          sugar: s ? { ...s, status: glucoseStatus(s.mgdl, s.context, p) } : null,
          bp:
            can.view_vitals && bpRow?.kind === "bp"
              ? { systolic: bpRow.systolic, diastolic: bpRow.diastolic, on: bpRow.measuredOn, status: bpStatus(bpRow.systolic, bpRow.diastolic) }
              : null,
          doses,
          unread,
          index,
        };
      })
    )
  ).filter((m): m is FamilyMember => m !== null && m.can.view_summary);

  return { user, members, today, clock, current, viewAs };
});

/** Things that need a look today, most serious first. */
export function familyNotices(members: FamilyMember[]): Notice[] {
  const out: Notice[] = [];
  for (const m of members) {
    if (m.unread) out.push({ kind: "alerts", patientId: m.id, name: m.firstName, count: m.unread });
    if (m.sugar && m.sugar.status.tone === "alert" && Date.now() - m.sugar.at.getTime() < 2 * 86_400_000) {
      out.push({ kind: "sugar", patientId: m.id, name: m.firstName, mgdl: m.sugar.mgdl, status: m.sugar.status });
    }
    if (m.bp && m.bp.status.tone === "alert") {
      out.push({ kind: "bp", patientId: m.id, name: m.firstName, systolic: m.bp.systolic, diastolic: m.bp.diastolic, status: m.bp.status });
    }
    for (const d of m.doses.filter((d) => d.late)) {
      out.push({ kind: "late_dose", patientId: m.id, name: m.firstName, med: d.name, slot: d.slot });
    }
    if (m.can.view_meds) {
      for (const r of m.demo?.refills ?? []) {
        const { days, tone } = refillStatus(r.pillsLeft, r.perDay);
        if (tone === "alert") out.push({ kind: "refill", patientId: m.id, name: m.firstName, med: r.medicineName, days });
      }
    }
  }
  const rank = { alerts: 0, sugar: 1, bp: 2, late_dose: 3, refill: 4 } as const;
  return out.sort((a, b) => rank[a.kind] - rank[b.kind]);
}

/** Clinic visits (demo) and booked doctor calls (real) in the next `days` days. */
export async function upcomingFor(members: FamilyMember[], today: string, current: Date, days = 21): Promise<Upcoming[]> {
  const until = new Date(current.getTime() + days * 86_400_000);
  const ids = members.map((m) => m.id);
  const byId = new Map(members.map((m) => [m.id, m]));
  const doctor = alias(users, "doctor");
  const calls = ids.length
    ? await db
        .select({
          id: callBookings.id,
          patientId: callBookings.patientId,
          scheduledAt: callBookings.scheduledAt,
          doctorName: doctor.name,
          reason: callBookings.reason,
        })
        .from(callBookings)
        .innerJoin(doctor, eq(callBookings.doctorId, doctor.id))
        .where(
          and(
            inArray(callBookings.patientId, ids),
            inArray(callBookings.status, ["requested", "accepted"]),
            gte(callBookings.scheduledAt, new Date(current.getTime() - 3_600_000))
          )
        )
    : [];
  const out: Upcoming[] = calls
    .filter((c) => c.scheduledAt <= until)
    .map((c) => {
      const m = byId.get(c.patientId)!;
      const time = new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Kolkata", hour: "2-digit", minute: "2-digit", hour12: false }).format(c.scheduledAt);
      return {
        id: c.id,
        patientId: c.patientId,
        name: m.firstName,
        title: c.reason ?? "",
        who: c.doctorName,
        place: "",
        on: istDate(c.scheduledAt),
        time,
        kind: "video" as const,
      };
    });
  const last = istDate(until);
  for (const m of members) {
    for (const a of m.demo?.appointments ?? []) {
      if (a.startsOn < today || a.startsOn > last) continue;
      out.push({ id: a.id, patientId: m.id, name: m.firstName, title: a.title, who: a.doctorName, place: a.place, on: a.startsOn, time: a.time, kind: a.kind });
    }
  }
  return out.sort((a, b) => `${a.on}${a.time}`.localeCompare(`${b.on}${b.time}`));
}
