import type { Severity } from "@/db/schema";
import { addDays, formatTime } from "@/lib/dates";
import { checkInteractions, GENERIC_LABEL } from "@/lib/drugs";
import { doseState, refillStatus, scheduleFor, type MedLike } from "@/lib/meds";
import { classify, formatReading, isAlarming, VITAL_META, type Reading } from "@/lib/vitals";

/** Alerts are computed live from the data, so they clear themselves when fixed. */
export type Alert = {
  id: string;
  kind: "missed_dose" | "abnormal_vital" | "refill" | "interaction" | "duplicate";
  severity: Severity;
  memberId: string;
  title: string;
  detail: string;
  href: string;
};

type Med = MedLike & { name: string; strength: string; genericName: string | null; pillsLeft: number | null; refillAt: number };
type Log = { medicationId: string; date: string; time: string; status: "taken" | "skipped" | "missed" };
type VitalRow = Reading & { memberId: string; measuredAt: Date };

export function computeAlerts(input: {
  members: { id: string; name: string }[];
  meds: Med[];
  logs: Log[];
  vitals: VitalRow[];
  now: { date: string; time: string; instant: Date };
}): Alert[] {
  const { members, meds, logs, vitals, now } = input;
  const nameOf = new Map(members.map((m) => [m.id, m.name.split(" ")[0]]));
  const logKey = new Map(logs.map((l) => [`${l.medicationId}|${l.date}|${l.time}`, l.status]));
  const alerts: Alert[] = [];

  for (const member of members) {
    const first = nameOf.get(member.id) ?? member.name;
    const memberMeds = meds.filter((m) => m.memberId === member.id);

    // Missed doses, today and yesterday
    const missed: string[] = [];
    for (const date of [addDays(now.date, -1), now.date]) {
      for (const dose of scheduleFor(memberMeds, date)) {
        const status = logKey.get(`${dose.medication.id}|${date}|${dose.time}`);
        if (doseState(dose, status, now) === "missed" && status !== "skipped") {
          missed.push(`${dose.medication.name} ${dose.medication.strength} at ${formatTime(dose.time)}${date === now.date ? "" : " yesterday"}`);
        }
      }
    }
    if (missed.length) {
      alerts.push({
        id: `missed-${member.id}`,
        kind: "missed_dose",
        severity: missed.length > 1 ? "warning" : "warning",
        memberId: member.id,
        title: `${first} missed ${missed.length === 1 ? "a dose" : `${missed.length} doses`}`,
        detail: missed.slice(0, 3).join(" · ") + (missed.length > 3 ? ` · +${missed.length - 3} more` : ""),
        href: `/medications?member=${member.id}`,
      });
    }

    // Abnormal latest readings in the last 48 hours
    const recent = vitals
      .filter((v) => v.memberId === member.id && now.instant.getTime() - v.measuredAt.getTime() < 48 * 3_600_000)
      .sort((a, b) => b.measuredAt.getTime() - a.measuredAt.getTime());
    const seenKinds = new Set<string>();
    for (const v of recent) {
      if (seenKinds.has(v.kind)) continue;
      seenKinds.add(v.kind);
      if (!isAlarming(v)) continue;
      const c = classify(v);
      const veryHigh =
        (v.kind === "bp" && (v.value >= 180 || (v.value2 ?? 0) >= 120)) ||
        (v.kind === "sugar" && (v.value < 54 || v.value > 300)) ||
        (v.kind === "spo2" && v.value < 92);
      alerts.push({
        id: `vital-${member.id}-${v.kind}`,
        kind: "abnormal_vital",
        severity: veryHigh ? "urgent" : "warning",
        memberId: member.id,
        title: `${first}'s ${VITAL_META[v.kind].label.toLowerCase()} is ${c.label.toLowerCase()}`,
        detail: `${c.label} · ${formatReading(v)} ${VITAL_META[v.kind].unit}. Recheck after resting 5 minutes.`,
        href: `/members/${member.id}?tab=vitals`,
      });
    }

    // Refills
    for (const m of memberMeds.filter((x) => x.active)) {
      const r = refillStatus(m);
      if (r.status === "soon" || r.status === "out") {
        alerts.push({
          id: `refill-${m.id}`,
          kind: "refill",
          severity: r.status === "out" ? "warning" : "info",
          memberId: member.id,
          title: r.status === "out" ? `${m.name} has run out` : `Refill ${m.name} soon`,
          detail: `${first} · ${m.pillsLeft} left, about ${r.daysLeft} day${r.daysLeft === 1 ? "" : "s"}`,
          href: `/medications?member=${member.id}`,
        });
      }
    }

    // Interactions and duplicates
    const active = memberMeds.filter((m) => m.active);
    const { interactions, duplicates } = checkInteractions(active.map((m) => ({ id: m.id, name: m.name, genericName: m.genericName })));
    for (const hit of interactions.filter((i) => i.severity !== "minor")) {
      alerts.push({
        id: `int-${member.id}-${hit.first.id}-${hit.second.id}`,
        kind: "interaction",
        severity: hit.severity === "major" ? "urgent" : "info",
        memberId: member.id,
        title: `${hit.first.name} + ${hit.second.name}: ${hit.severity === "major" ? "serious" : "check timing"}`,
        detail: `${first} · ${hit.effect}`,
        href: `/medications?member=${member.id}#interactions`,
      });
    }
    for (const dup of duplicates) {
      alerts.push({
        id: `dup-${member.id}-${dup.generic}`,
        kind: "duplicate",
        severity: "warning",
        memberId: member.id,
        title: `Same medicine twice: ${GENERIC_LABEL[dup.generic]}`,
        detail: `${first} · ${dup.medicines.map((m) => m.name).join(" and ")} both contain ${GENERIC_LABEL[dup.generic].toLowerCase()}.`,
        href: `/medications?member=${member.id}#interactions`,
      });
    }
  }

  const rank: Record<Severity, number> = { urgent: 0, warning: 1, info: 2 };
  return alerts.sort((a, b) => rank[a.severity] - rank[b.severity]);
}
