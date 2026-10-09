import "server-only";
import type { AppContext } from "@/lib/context";
import { getDashboard } from "@/lib/data";
import { ageFrom, formatDateTime, formatTime } from "@/lib/dates";
import { firstName, relationLabel } from "@/lib/labels";
import { languageLabel } from "@/lib/languages";
import { evaluateRedFlags, LEVEL_COPY } from "@/lib/triage/rules";
import { classify, formatReading, VITAL_META } from "@/lib/vitals";

/**
 * The Pulse assistant: a chat about the family's own health data, with the same
 * principles as triage. Safety rules run first; an emergency never reaches the AI.
 * It only sees members this role may see, and it never diagnoses.
 */

// Follow-up turns reuse the snapshot briefly instead of re-reading the dashboard every message.
const SNAPSHOT_TTL_MS = 60_000;
const snapshots = new Map<string, { at: number; text: string }>();

/** A compact, plain-text snapshot of what this person can see. Kept small: it goes in every request. */
export async function familySnapshot(ctx: AppContext): Promise<string> {
  // Keyed by role and visible members so a "View as" preview never sees the admin's snapshot.
  const key = `${ctx.user.id}|${ctx.role}|${ctx.visibleMembers.map((m) => m.id).join(",")}`;
  const now = Date.now();
  const hit = snapshots.get(key);
  if (hit && now - hit.at < SNAPSHOT_TTL_MS) return hit.text;
  const text = await buildSnapshot(ctx);
  for (const [k, v] of snapshots) if (now - v.at >= SNAPSHOT_TTL_MS) snapshots.delete(k);
  snapshots.set(key, { at: now, text });
  return text;
}

async function buildSnapshot(ctx: AppContext): Promise<string> {
  const d = await getDashboard(ctx);
  const lines: string[] = [];
  for (const m of ctx.visibleMembers) {
    const age = ageFrom(m.dateOfBirth);
    const who = `${m.name} (${relationLabel(m.relation, m.sex, m.id === ctx.self.id)}${age !== null ? `, ${age}y` : ""}${m.sex ? `, ${m.sex}` : ""})`;
    lines.push(`## ${who}`);
    if (m.bloodGroup) lines.push(`Blood group: ${m.bloodGroup}`);
    if (m.conditions.length) lines.push(`Conditions: ${m.conditions.map((c) => c.name).join(", ")}`);
    lines.push(`Allergies: ${m.allergies.length ? m.allergies.map((a) => `${a.name} (${a.severity})`).join(", ") : "none recorded"}`);

    const meds = d.meds.filter((x) => x.memberId === m.id);
    if (meds.length) {
      lines.push("Medicines:");
      for (const x of meds) {
        lines.push(
          `- ${x.name}${x.genericName ? ` (${x.genericName})` : ""} ${x.strength}, at ${x.times.map(formatTime).join(", ")}${x.instructions ? `, ${x.instructions}` : ""}${x.pillsLeft !== null ? `, ${x.pillsLeft} left` : ""}`
        );
      }
    }
    const doses = d.todayDoses.filter((x) => x.memberId === m.id);
    if (doses.length) lines.push(`Today's doses: ${doses.map((x) => `${x.name} ${formatTime(x.time)} ${x.state}`).join("; ")}`);
    const adherence = d.adherenceByMember.get(m.id);
    if (adherence?.percent != null) lines.push(`7-day adherence: ${adherence.percent}%`);

    const vitals = d.latest.get(m.id);
    if (vitals?.size) {
      lines.push(
        `Latest vitals: ${[...vitals.values()]
          .map((v) => `${VITAL_META[v.kind].label} ${formatReading(v)} ${VITAL_META[v.kind].unit}, ${classify(v).label} (${formatDateTime(v.measuredAt)})`)
          .join("; ")}`
      );
    }
    const appts = d.upcoming.filter((a) => a.memberId === m.id);
    if (appts.length) lines.push(`Upcoming appointments: ${appts.map((a) => `${a.doctorName}${a.specialty ? ` (${a.specialty})` : ""} on ${formatDateTime(a.startsAt)}, ${a.mode === "video" ? "video" : "in person"}`).join("; ")}`);
    const alerts = d.alerts.filter((a) => a.memberId === m.id);
    if (alerts.length) lines.push(`Alerts: ${alerts.map((a) => `${a.title}: ${a.detail}`).join("; ")}`);
    lines.push("");
  }
  return lines.join("\n").trim();
}

export function systemPrompt(ctx: AppContext, snapshot: string, language: string): string {
  const now = new Intl.DateTimeFormat("en-IN", { dateStyle: "full", timeStyle: "short", timeZone: "Asia/Kolkata" }).format(new Date());
  return [
    `You are Pulse, a warm, calm family health companion inside the Pulse app. You are talking with ${ctx.user.name} (call them ${firstName(ctx.user.name)}), who manages health for the "${ctx.family.name}" family. It is ${now} in India.`,
    `Reply in ${languageLabel(language)}${language.startsWith("en") ? "" : " (use its native script)"}, matching the language the user writes in if they switch.`,
    "Your replies are often read aloud, so: write 1 to 4 short sentences of plain spoken text. No markdown, bullet points, asterisks, emojis, tables or headings. Say times like a person would (\"8 in the morning\").",
    "What you can do: answer questions about the family's medicines, doses, vitals, appointments, allergies and conditions using ONLY the data below; explain medicines and health topics in plain words; help them remember and plan; point them to the right part of the app (Dashboard, Medicines, Appointments, Records, Symptom check, Emergency card).",
    "Rules you never break:",
    "- Never diagnose, never start, stop or change a dose, never contradict a doctor. Say \"please check with your doctor\" when a decision is medical.",
    "- For new or worsening symptoms, suggest the Symptom check page, and a doctor. For anything that sounds serious (chest pain, breathing trouble, stroke signs, fainting, heavy bleeding, thoughts of self-harm), tell them to call 112 now.",
    "- If the data doesn't say, say you don't know. Never invent readings, medicines or appointments.",
    "- Only discuss the people listed below; you cannot see anyone else in the family.",
    "- You cannot change anything in the app yourself; tell them where to tap instead.",
    "",
    "# Family health data (only what this user is allowed to see)",
    snapshot || "No health data recorded yet.",
  ].join("\n");
}

/** Rules before AI: an emergency gets a fixed, safe reply and the model is never called. */
export function emergencyReply(text: string, language: string): string | null {
  const rules = evaluateRedFlags({ symptoms: text, flags: {}, ageYears: null });
  if (rules.level !== "emergency") return null;
  const hi = language.startsWith("hi");
  const copy = LEVEL_COPY.emergency;
  const reason = rules.redFlags.find((f) => f.level === "emergency")?.reason;
  return hi
    ? `${copy.hiTitle}। ${copy.hiAction} ऐप में इमरजेंसी कार्ड खोलकर डॉक्टर को दिखाएँ।`
    : `${copy.title}. ${reason ? `${reason} ` : ""}${copy.action} You can open the Emergency card in the app to show the doctors.`;
}

/** Strip anything a model might still add that sounds wrong when spoken. */
export function forSpeech(text: string): string {
  return text
    .replace(/```[\s\S]*?```/g, "")
    .replace(/[*_#`>]+/g, "")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/^\s*[-•]\s+/gm, "")
    .replace(/\s+/g, " ")
    .trim();
}
