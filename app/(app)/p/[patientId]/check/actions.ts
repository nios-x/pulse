"use server";

import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { moodChecks } from "@/db/schema";
import { createAlert } from "@/lib/alerts";
import { requirePermission } from "@/lib/permissions";
import { moodOutcome, scoreMoodCheck, type MoodOutcome } from "@/lib/safety";
import { followUpSchema, moodSchema, patientRefSchema } from "@/lib/validators";

/** Saves the two answers. Only the patient (owner) can answer. Never alerts the family. */
export async function submitMoodAction(input: { patientId: string; q1: number; q2: number }) {
  const parsed = moodSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const };
  const { patientId, q1, q2 } = parsed.data;
  const { user } = await requirePermission(patientId, "answer_mood");

  const { score, needsFollowUp } = scoreMoodCheck(q1, q2);
  const [row] = await db
    .insert(moodChecks)
    .values({ patientId, loggedBy: user.id, q1, q2, score })
    .returning({ id: moodChecks.id });
  return { ok: true as const, checkId: row.id, score, needsFollowUp };
}

export async function answerFollowUpAction(input: {
  patientId: string;
  checkId: string;
  answer: boolean;
}): Promise<{ ok: boolean; outcome?: MoodOutcome }> {
  const parsed = followUpSchema.safeParse(input);
  if (!parsed.success) return { ok: false };
  const { patientId, checkId, answer } = parsed.data;
  const { user } = await requirePermission(patientId, "answer_mood");

  const [row] = await db
    .update(moodChecks)
    .set({ selfHarmFlag: answer })
    .where(and(eq(moodChecks.id, checkId), eq(moodChecks.patientId, patientId), eq(moodChecks.loggedBy, user.id)))
    .returning({ score: moodChecks.score });
  if (!row) return { ok: false };
  return { ok: true, outcome: moodOutcome(row.score, answer) };
}

/**
 * Only when the patient taps "Yes, tell them": a support request for the
 * caregivers. It carries no score and no answers.
 */
export async function requestSupportAction(input: { patientId: string }) {
  const parsed = patientRefSchema.safeParse(input);
  if (!parsed.success) return { ok: false };
  const { patientId } = parsed.data;
  const { user } = await requirePermission(patientId, "answer_mood");
  await createAlert({ patientId, loggedBy: user.id, kind: "support_request", severity: "urgent" });
  return { ok: true };
}
