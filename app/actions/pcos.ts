"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { cycleLogs, foodLogs, members, pcosProfiles, protocolLogs, symptomLogs } from "@/db/schema";
import { runAction, type ActionResult } from "@/lib/action";
import { audit } from "@/lib/audit";
import { ForbiddenError, getContext, requireCan } from "@/lib/context";
import { istDate } from "@/lib/dates";
import { classifyPhenotype, mealFeedback, PCOS_FOODS, PCOS_SYMPTOMS, PHENOTYPE_INFO, type OnboardingAnswers } from "@/lib/pcos";

const prescribed = z.array(z.object({ name: z.string().trim().min(1).max(80), dose: z.string().trim().max(40), frequency: z.string().trim().max(60) })).max(10);

const setupInput = z.object({
  memberId: z.string().uuid(),
  doctorName: z.string().trim().min(2, "Enter your doctor's name").max(80),
  diagnosedOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).or(z.literal("")).optional(),
  prescribed: prescribed.min(1, "Add at least one item from your prescription"),
  supplements: prescribed,
  answers: z.object({
    diagnosedWhen: z.enum(["recent", "1_3_years", "3_plus_years", "suspected"]),
    wasBirthControl: z.boolean(),
    weightDistribution: z.enum(["midsection", "even", "lean", "prefer_not"]),
    concerns: z.array(z.string().max(30)).max(10),
    stressLevel: z.enum(["managing", "constant", "panic_anxiety"]),
    sleepPattern: z.enum(["before_midnight", "midnight_2am", "after_2am", "chaotic"]),
    eatingPattern: z.enum(["regular_3meals", "skip_breakfast", "eat_when_remember", "restrict_binge"]),
    topPriority: z.enum(["periods", "skin", "energy", "weight", "fertility", "all"]),
  }),
});

/** Doctor's prescription first, then the quiz. The phenotype guides lifestyle actions only. */
export async function savePcosSetup(input: unknown): Promise<ActionResult<{ phenotype: string; eatingConcern: boolean }>> {
  return runAction(async () => {
    const ctx = await getContext();
    const data = setupInput.parse(input);
    requireCan(ctx, "member.edit", data.memberId);
    const phenotype = classifyPhenotype(data.answers as OnboardingAnswers, data.prescribed);
    const values = {
      phenotype,
      answers: data.answers,
      doctorName: data.doctorName,
      diagnosedOn: data.diagnosedOn || null,
      prescribed: data.prescribed,
      supplements: data.supplements,
      updatedAt: new Date(),
    };
    await db.insert(pcosProfiles).values({ memberId: data.memberId, ...values }).onConflictDoUpdate({ target: pcosProfiles.memberId, set: values });
    const member = ctx.members.find((m) => m.id === data.memberId)!;
    if (!member.conditions.some((c) => c.name.toLowerCase().includes("pcos"))) {
      await db.update(members).set({ conditions: [...member.conditions, { name: "PCOS", since: data.diagnosedOn?.slice(0, 4) || undefined }] }).where(eq(members.id, member.id));
    }
    await audit(ctx.family.id, ctx.user.id, "pcos.setup", { member: member.name });
    revalidatePath("/", "layout");
    return {
      ok: true,
      message: `PCOS care set up: ${PHENOTYPE_INFO[phenotype].title} pattern`,
      data: { phenotype, eatingConcern: data.answers.eatingPattern === "restrict_binge" },
    };
  });
}

const protocolInput = z.object({ memberId: z.string().uuid(), actionKey: z.string().min(2).max(40), done: z.boolean() });

export async function toggleProtocol(input: unknown): Promise<ActionResult> {
  return runAction(async () => {
    const ctx = await getContext();
    const data = protocolInput.parse(input);
    requireCan(ctx, "vitals.log", data.memberId);
    const date = istDate();
    if (data.done) {
      await db.insert(protocolLogs).values({ memberId: data.memberId, date, actionKey: data.actionKey, loggedBy: ctx.user.id }).onConflictDoNothing();
    } else {
      await db.delete(protocolLogs).where(and(eq(protocolLogs.memberId, data.memberId), eq(protocolLogs.date, date), eq(protocolLogs.actionKey, data.actionKey)));
    }
    revalidatePath("/", "layout");
    return { ok: true, message: data.done ? "Nice! +5 XP" : "Unticked" };
  });
}

const cycleInput = z.object({
  memberId: z.string().uuid(),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Pick the first day of your period"),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).or(z.literal("")).optional(),
  flow: z.enum(["light", "medium", "heavy"]),
  notes: z.string().trim().max(300).optional(),
});

export async function logCycle(input: unknown): Promise<ActionResult> {
  return runAction(async () => {
    const ctx = await getContext();
    const data = cycleInput.parse(input);
    requireCan(ctx, "vitals.log", data.memberId);
    if (data.startDate > istDate()) return { ok: false, error: "The start date can't be in the future.", fieldErrors: { startDate: "Can't be in the future" } };
    if (data.endDate && data.endDate < data.startDate) return { ok: false, error: "The end date is before the start.", fieldErrors: { endDate: "Must be after the start" } };
    await db
      .insert(cycleLogs)
      .values({ memberId: data.memberId, startDate: data.startDate, endDate: data.endDate || null, flow: data.flow, notes: data.notes || null, loggedBy: ctx.user.id })
      .onConflictDoUpdate({ target: [cycleLogs.memberId, cycleLogs.startDate], set: { endDate: data.endDate || null, flow: data.flow, notes: data.notes || null } });
    revalidatePath("/pcos");
    return { ok: true, message: "Period logged. No 28-day pressure: we just track your own rhythm." };
  });
}

export async function deleteCycle(id: string): Promise<ActionResult> {
  return runAction(async () => {
    const ctx = await getContext();
    const [row] = await db.select().from(cycleLogs).where(eq(cycleLogs.id, id)).limit(1);
    if (!row) throw new ForbiddenError("Already removed.");
    requireCan(ctx, "vitals.log", row.memberId);
    await db.delete(cycleLogs).where(eq(cycleLogs.id, id));
    revalidatePath("/pcos");
    return { ok: true, message: "Entry removed" };
  });
}

const symptomInput = z.object({ memberId: z.string().uuid(), symptom: z.enum(PCOS_SYMPTOMS.map((s) => s.key) as [string, ...string[]]), severity: z.number().int().min(0).max(3) });

export async function logSymptom(input: unknown): Promise<ActionResult> {
  return runAction(async () => {
    const ctx = await getContext();
    const data = symptomInput.parse(input);
    requireCan(ctx, "vitals.log", data.memberId);
    const date = istDate();
    if (data.severity === 0) {
      await db.delete(symptomLogs).where(and(eq(symptomLogs.memberId, data.memberId), eq(symptomLogs.date, date), eq(symptomLogs.symptom, data.symptom)));
    } else {
      await db
        .insert(symptomLogs)
        .values({ memberId: data.memberId, date, symptom: data.symptom, severity: data.severity, loggedBy: ctx.user.id })
        .onConflictDoUpdate({ target: [symptomLogs.memberId, symptomLogs.date, symptomLogs.symptom], set: { severity: data.severity } });
    }
    revalidatePath("/pcos");
    return { ok: true, message: "Saved" };
  });
}

const mealInput = z.object({
  memberId: z.string().uuid(),
  meal: z.enum(["breakfast", "lunch", "dinner", "snack"]),
  items: z.array(z.enum(PCOS_FOODS.map((f) => f.key) as [string, ...string[]])).min(1, "Pick at least one food").max(12),
});

export async function logMeal(input: unknown): Promise<ActionResult<{ balanced: boolean; tip: string }>> {
  return runAction(async () => {
    const ctx = await getContext();
    const data = mealInput.parse(input);
    requireCan(ctx, "vitals.log", data.memberId);
    await db.insert(foodLogs).values({ memberId: data.memberId, date: istDate(), meal: data.meal, items: data.items, loggedBy: ctx.user.id });
    const fb = mealFeedback(data.items);
    revalidatePath("/pcos");
    return { ok: true, message: fb.balanced ? "Balanced meal logged" : "Meal logged", data: fb };
  });
}
