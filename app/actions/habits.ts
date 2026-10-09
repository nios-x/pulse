"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { carePlans, graceDays, habitLogs, medications, pcosProfiles } from "@/db/schema";
import { runAction, type ActionResult } from "@/lib/action";
import { audit } from "@/lib/audit";
import { getContext, requireCan } from "@/lib/context";
import { addDays, ageFrom, istDate } from "@/lib/dates";
import { getGameSummaries } from "@/lib/game-data";
import { QUESTS } from "@/lib/gamification";
import { latestByKind, getVitals } from "@/lib/data";
import { recommend } from "@/lib/recommendations";
import { bmi } from "@/lib/vitals";

const habitInput = z.object({
  memberId: z.string().uuid(),
  kind: z.enum(["water", "walk", "sleep", "produce", "mindful"]),
  value: z.coerce.number().min(0).max(24 * 60),
});

/**
 * Sets today's value for a habit. Returns what was unlocked so the UI can celebrate.
 * Habits are personal logging, so they use the "record vitals" permission.
 */
export async function logHabit(input: unknown): Promise<ActionResult<{ questDone: string | null; streak: number; xp: number; level: string; leveledUp: boolean }>> {
  return runAction(async () => {
    const ctx = await getContext();
    const data = habitInput.parse(input);
    requireCan(ctx, "vitals.log", data.memberId);
    const today = istDate();
    const before = (await getGameSummaries([data.memberId])).get(data.memberId)!;
    await db
      .insert(habitLogs)
      .values({ memberId: data.memberId, date: today, kind: data.kind, value: data.value, loggedBy: ctx.user.id })
      .onConflictDoUpdate({ target: [habitLogs.memberId, habitLogs.date, habitLogs.kind], set: { value: data.value, loggedBy: ctx.user.id, updatedAt: new Date() } });
    const after = (await getGameSummaries([data.memberId])).get(data.memberId)!;
    const newlyDone = after.today.done.find((k) => !before.today.done.includes(k)) ?? null;
    revalidatePath("/", "layout");
    const quest = newlyDone ? QUESTS.find((q) => q.key === newlyDone)! : null;
    return {
      ok: true,
      message: quest ? `Quest complete: ${quest.short}! +${quest.xp} XP` : `${data.kind === "water" ? "Water" : data.kind === "walk" ? "Walk" : data.kind === "sleep" ? "Sleep" : data.kind === "produce" ? "Fruit & veg" : "Mindful minutes"} saved`,
      data: { questDone: newlyDone, streak: after.streak, xp: after.xp, level: after.level.name, leveledUp: after.level.index > before.level.index },
    };
  });
}

const graceInput = z.object({ memberId: z.string().uuid(), reason: z.enum(["period", "flare_up", "sick", "travel", "mental_health"]) });

/** A rest day keeps the streak alive. Limited to 2 per rolling week so streaks still mean something. */
export async function takeGraceDay(input: unknown): Promise<ActionResult> {
  return runAction(async () => {
    const ctx = await getContext();
    const data = graceInput.parse(input);
    requireCan(ctx, "vitals.log", data.memberId);
    const today = istDate();
    const recent = await db.select().from(graceDays).where(eq(graceDays.memberId, data.memberId));
    const weekAgo = addDays(today, -7);
    if (recent.filter((g) => g.date > weekAgo).length >= 2) return { ok: false, error: "You've used 2 rest days this week. Your streak is safe with what's left of today." };
    await db.insert(graceDays).values({ memberId: data.memberId, date: today, reason: data.reason }).onConflictDoNothing();
    revalidatePath("/", "layout");
    return { ok: true, message: "Rest day saved. Your streak is protected today. Be kind to yourself." };
  });
}

/** Starts (or restarts) the personalized plan from today's recommendations. */
export async function startCarePlan(memberId: string): Promise<ActionResult> {
  return runAction(async () => {
    const ctx = await getContext();
    requireCan(ctx, "member.edit", memberId);
    const member = ctx.members.find((m) => m.id === memberId)!;
    const [vit, meds, pcos] = await Promise.all([
      getVitals([memberId], 30),
      db.select({ id: medications.id }).from(medications).where(and(eq(medications.memberId, memberId), eq(medications.active, true))),
      db.select().from(pcosProfiles).where(eq(pcosProfiles.memberId, memberId)),
    ]);
    const latest = latestByKind(vit).get(memberId);
    const items = recommend({
      age: ageFrom(member.dateOfBirth),
      sex: member.sex,
      conditions: member.conditions,
      latest: {
        bpSys: latest?.get("bp") ? Number(latest.get("bp")!.value) : undefined,
        bpDia: latest?.get("bp")?.value2 != null ? Number(latest.get("bp")!.value2) : undefined,
        sugarFasting: vit.filter((v) => v.kind === "sugar" && v.context === "fasting").at(-1)?.value,
        bmi: bmi(latest?.get("weight") ? Number(latest.get("weight")!.value) : null, member.heightCm),
      },
      pcos: pcos[0]?.phenotype ?? null,
      hasMeds: meds.length > 0,
    });
    await db.update(carePlans).set({ active: false }).where(eq(carePlans.memberId, memberId));
    await db.insert(carePlans).values({ memberId, startedOn: istDate(), items, createdBy: ctx.user.id });
    await audit(ctx.family.id, ctx.user.id, "plan.started", { member: member.name, items: items.length });
    revalidatePath("/", "layout");
    return { ok: true, message: `Plan started for ${member.name.split(" ")[0]}. Progress shows up week by week.` };
  });
}
