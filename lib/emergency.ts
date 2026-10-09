import "server-only";
import { and, eq, gt, isNull } from "drizzle-orm";
import { db } from "@/db";
import { medications, shareLinks, type Member } from "@/db/schema";
import type { EmergencyData } from "@/components/emergency/emergency-card";
import { ageFrom, formatDate } from "@/lib/dates";

export async function emergencyData(member: Member): Promise<EmergencyData> {
  const meds = await db.select().from(medications).where(and(eq(medications.memberId, member.id), eq(medications.active, true)));
  return {
    name: member.name,
    age: ageFrom(member.dateOfBirth),
    sex: member.sex,
    bloodGroup: member.bloodGroup,
    allergies: [...member.allergies].sort((a, b) => (a.severity === "severe" ? -1 : b.severity === "severe" ? 1 : 0)),
    conditions: member.conditions,
    medicines: meds.map((m) => ({ name: m.name, strength: m.strength, times: m.times })),
    contacts: member.emergencyContacts,
    notes: member.notes,
    updated: formatDate(new Date()),
  };
}

export async function liveEmergencyLink(memberId: string) {
  const [link] = await db
    .select()
    .from(shareLinks)
    .where(and(eq(shareLinks.memberId, memberId), eq(shareLinks.scope, "emergency"), isNull(shareLinks.revokedAt), gt(shareLinks.expiresAt, new Date())))
    .limit(1);
  return link ?? null;
}

export function emergencySpeech(d: EmergencyData): string {
  return [
    `Emergency information for ${d.name}${d.age != null ? `, ${d.age} years old` : ""}.`,
    `Blood group ${d.bloodGroup ? d.bloodGroup.replace("+", " positive").replace("-", " negative") : "not known"}.`,
    d.allergies.length ? `Allergies: ${d.allergies.map((a) => `${a.name}, ${a.severity}`).join("; ")}.` : "No known allergies.",
    d.conditions.length ? `Conditions: ${d.conditions.map((c) => c.name).join(", ")}.` : "",
    d.medicines.length ? `Medicines: ${d.medicines.map((m) => `${m.name} ${m.strength}`).join(", ")}.` : "",
    d.contacts[0] ? `Call ${d.contacts[0].name}, ${d.contacts[0].relation}, at ${d.contacts[0].phone.split("").join(" ")}.` : "",
  ].filter(Boolean).join(" ");
}
