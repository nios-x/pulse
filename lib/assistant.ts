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
type FamilyData = { snapshot: string; suggestions: string[] };
const snapshots = new Map<string, { at: number; data: FamilyData }>();

/**
 * A compact, plain-text snapshot of what this person can see (kept small: it goes in every
 * request), plus suggested questions drawn from what needs attention right now.
 */
export async function familyData(ctx: AppContext): Promise<FamilyData> {
  // Keyed by role and visible members so a "View as" preview never sees the admin's snapshot.
  const key = `${ctx.user.id}|${ctx.role}|${ctx.visibleMembers.map((m) => m.id).join(",")}`;
  const now = Date.now();
  const hit = snapshots.get(key);
  if (hit && now - hit.at < SNAPSHOT_TTL_MS) return hit.data;
  const d = await getDashboard(ctx);
  const data = { snapshot: buildSnapshot(ctx, d), suggestions: dataSuggestions(ctx, d) };
  for (const [k, v] of snapshots) if (now - v.at >= SNAPSHOT_TTL_MS) snapshots.delete(k);
  snapshots.set(key, { at: now, data });
  return data;
}

type Dashboard = Awaited<ReturnType<typeof getDashboard>>;

/** Questions about what needs attention today, most urgent first. */
function dataSuggestions(ctx: AppContext, d: Dashboard): string[] {
  const out: string[] = [];
  const isSelf = (memberId: string) => memberId === ctx.self.id;
  const name = (memberId: string) => firstName(ctx.visibleMembers.find((m) => m.id === memberId)?.name ?? "");
  const whose = (memberId: string) => (isSelf(memberId) ? "my" : `${name(memberId)}'s`);
  const rank = { urgent: 0, warning: 1, info: 2 } as const;
  for (const a of [...d.alerts].sort((x, y) => rank[x.severity] - rank[y.severity])) {
    // Alert titles read "Papa's blood pressure is high" / "Papa missed a dose".
    if (a.kind === "abnormal_vital") {
      const what = a.title.replace(/^.+?'s /, `${whose(a.memberId)} `);
      out.push(`${what.charAt(0).toUpperCase()}${what.slice(1)}. What should ${isSelf(a.memberId) ? "I" : "we"} do?`);
    } else if (a.kind === "missed_dose") out.push(isSelf(a.memberId) ? "I missed a dose. What should I do?" : `${name(a.memberId)} missed a dose. What should we do?`);
    else if (a.kind === "refill") out.push("Which medicines need a refill soon?");
    else if (a.kind === "interaction") out.push(`Is it safe to take ${a.title.split(":")[0]} together?`);
    if (out.length >= 2) break;
  }
  if (d.todayDoses.some((x) => x.state === "due")) out.push("Which medicines are due right now?");
  const soon = d.upcoming.find((a) => a.startsAt.getTime() - Date.now() < 7 * 86_400_000);
  if (soon) out.push(`Help me prepare for ${whose(soon.memberId)} visit with ${soon.doctorName}`);
  return [...new Set(out)];
}

function buildSnapshot(ctx: AppContext, d: Dashboard): string {
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

export function systemPrompt(ctx: AppContext, snapshot: string, language: string, knowledge: string): string {
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
    "# What you know about this user (from earlier chats)",
    "Use this to personalise: their preferences, routines, goals and worries, and what you talked about before. Mention past chats only when relevant, and never repeat this section back verbatim.",
    knowledge || "Nothing yet. This may be your first chat.",
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
