import "server-only";
import { z } from "zod";
import type { Member, TriageLevel } from "@/db/schema";
import { geminiJson } from "@/lib/ai";
import { ageFrom } from "@/lib/dates";
import { languageLabel } from "@/lib/languages";
import { combineLevels, evaluateRedFlags, LEVEL_COPY, looksLikeDiagnosis, type RedFlag, type TriageInput } from "@/lib/triage/rules";

export type TriageResult = {
  level: TriageLevel;
  title: string;
  action: string;
  summary: string;
  whatToDo: string[];
  watchFor: string[];
  questionsForDoctor: string[];
  specialty: string | null;
  redFlags: RedFlag[];
  source: "rules" | "rules+ai";
  aiNote: string | null;
  language: string;
};

const aiSchema = z.object({
  level: z.enum(["emergency", "urgent", "doctor", "self_care"]),
  summary: z.string().max(400).describe("One or two plain sentences restating what the person described, without naming a disease"),
  whatToDo: z.array(z.string().max(200)).max(5).describe("Simple, safe steps. No medicine names or doses."),
  watchFor: z.array(z.string().max(160)).max(5).describe("Warning signs that mean get help sooner"),
  questionsForDoctor: z.array(z.string().max(160)).max(4),
  specialty: z.string().max(60).nullable().describe("Kind of doctor to see, e.g. General Physician, Paediatrician"),
});

const SYSTEM = `You are a cautious symptom triage assistant for Indian families. You are NOT a doctor.
Your only job: suggest how urgently to seek care (a triage level) and simple, safe general steps.
Hard rules:
- Never diagnose. Never say "you have", never name a likely disease as a conclusion.
- Never recommend or name medicines, doses or supplements.
- When unsure, choose the MORE urgent level.
- Levels: "emergency" (call 112/108 now), "urgent" (see a doctor today), "doctor" (book within 1-2 days), "self_care" (care at home and watch).
- Use plain words suitable for an elderly person. Short sentences.
- Write every text field in the requested language.`;

/** Plain-language fallback content per level, used without AI or when AI output is rejected. */
const FALLBACK: Record<TriageLevel, { whatToDo: string[]; watchFor: string[]; specialty: string | null }> = {
  emergency: {
    whatToDo: ["Call 112 or 108 now.", "Keep the person sitting or lying comfortably and stay with them.", "Keep the emergency card and current medicines ready to show."],
    watchFor: [],
    specialty: null,
  },
  urgent: {
    whatToDo: ["See a doctor today, at a clinic or by video consult.", "Note when it started and anything that makes it better or worse.", "Do not eat or drink anything new until a doctor has checked."],
    watchFor: ["Trouble breathing", "Chest pain", "Fainting or confusion", "Symptoms getting quickly worse"],
    specialty: "General Physician",
  },
  doctor: {
    whatToDo: ["Book a doctor visit in the next 1–2 days.", "Rest and drink enough water.", "Write down symptoms and temperature twice a day."],
    watchFor: ["Fever above 103°F", "Breathing trouble", "Not able to eat or drink", "New severe pain"],
    specialty: "General Physician",
  },
  self_care: {
    whatToDo: ["Rest and drink plenty of fluids.", "Keep a note of how you feel each day.", "Book a doctor if it lasts more than 3 days or gets worse."],
    watchFor: ["High fever", "Breathing trouble", "Symptoms lasting more than a week"],
    specialty: null,
  },
};

export async function runTriage(input: TriageInput & { language: string }, member: Member, opts: { useAi: boolean }): Promise<TriageResult> {
  const rules = evaluateRedFlags(input);
  const hindi = input.language.startsWith("hi");
  const copy = LEVEL_COPY[rules.level];
  const base: TriageResult = {
    level: rules.level,
    title: hindi ? copy.hiTitle : copy.title,
    action: hindi ? copy.hiAction : copy.action,
    summary: rules.redFlags.length ? rules.redFlags.map((f) => f.reason).join(" ") : "No warning signs were found in what you described.",
    whatToDo: FALLBACK[rules.level].whatToDo,
    watchFor: FALLBACK[rules.level].watchFor,
    questionsForDoctor: [],
    specialty: FALLBACK[rules.level].specialty,
    redFlags: rules.redFlags,
    source: "rules",
    aiNote: null,
    language: input.language,
  };
  if (rules.redFlags.some((f) => f.code === "self_harm")) {
    base.whatToDo = ["Call Tele-MANAS on 14416 (free, 24×7) or 112 now.", "Stay with the person. Remove anything they could use to hurt themselves.", "Talk calmly and listen. You don't have to fix it alone."];
  }

  // Emergencies are decided by the rules alone; the AI is never asked.
  if (rules.final || !opts.useAi) {
    if (!opts.useAi && !rules.final) base.aiNote = "AI is not configured, so this result comes from the safety rules only.";
    return base;
  }

  const age = ageFrom(member.dateOfBirth);
  const context = [
    `Person: ${age ?? "unknown"} years old, ${member.sex ?? "sex not given"}.`,
    member.conditions.length ? `Known conditions: ${member.conditions.map((c) => c.name).join(", ")}.` : "",
    member.allergies.length ? `Allergies: ${member.allergies.map((a) => a.name).join(", ")}.` : "",
    input.durationDays != null ? `Duration: ${input.durationDays} days.` : "",
    input.severity != null ? `Severity: ${input.severity}/10.` : "",
    input.temperatureF != null ? `Temperature: ${input.temperatureF}°F.` : "",
    `Yes/no answers: ${Object.entries(input.flags).filter(([, v]) => v).map(([k]) => k).join(", ") || "none"}.`,
    `Safety rules already set the minimum level to "${rules.level}". You may raise it, never lower it.`,
    `Reply language: ${languageLabel(input.language)}.`,
    `Symptoms in their words: """${input.symptoms.slice(0, 1500)}"""`,
  ].filter(Boolean).join("\n");

  const res = await geminiJson([{ text: context }], aiSchema, { system: SYSTEM, temperature: 0.2 });
  if (!res.ok) {
    base.aiNote = res.reason === "busy" ? "The AI was busy, so this result comes from the safety rules only." : "The AI couldn't answer, so this result comes from the safety rules only.";
    return base;
  }
  const ai = res.data;
  const allText = [ai.summary, ...ai.whatToDo, ...ai.watchFor, ...ai.questionsForDoctor].join(" ");
  const level = combineLevels(rules.level, ai.level);
  const finalCopy = LEVEL_COPY[level];
  if (looksLikeDiagnosis(allText)) {
    // Safety net: anything that reads like a diagnosis or prescription is discarded.
    return { ...base, level, title: hindi ? finalCopy.hiTitle : finalCopy.title, action: hindi ? finalCopy.hiAction : finalCopy.action, whatToDo: FALLBACK[level].whatToDo, watchFor: FALLBACK[level].watchFor, aiNote: "The AI's wording was removed because it sounded like a diagnosis. Showing safe general advice." };
  }
  return {
    level,
    title: hindi ? finalCopy.hiTitle : finalCopy.title,
    action: hindi ? finalCopy.hiAction : finalCopy.action,
    summary: ai.summary,
    whatToDo: ai.whatToDo.length ? ai.whatToDo : FALLBACK[level].whatToDo,
    watchFor: ai.watchFor,
    questionsForDoctor: ai.questionsForDoctor,
    specialty: ai.specialty ?? FALLBACK[level].specialty,
    redFlags: rules.redFlags,
    source: "rules+ai",
    aiNote: level !== ai.level ? `The safety rules kept this at "${level.replace("_", " ")}" even though the AI suggested lower.` : null,
    language: input.language,
  };
}
