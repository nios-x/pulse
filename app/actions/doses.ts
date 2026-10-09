"use server";

import { revalidatePath } from "next/cache";
import { and, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { doseLogs, medications } from "@/db/schema";
import { runAction, type ActionResult } from "@/lib/action";
import { getContext, requireCan, ForbiddenError } from "@/lib/context";
import { getTodayDoses } from "@/lib/data";
import { istDate } from "@/lib/dates";
import { doseSchema } from "@/lib/validators";

/** Mark a scheduled dose taken or skipped, or undo it. Taking a dose counts one pill down. */
export async function logDose(input: { medicationId: string; date: string; time: string; status: "taken" | "skipped" | "undo" }): Promise<ActionResult<{ allDone: boolean }>> {
  return runAction(async () => {
    const ctx = await getContext();
    const data = doseSchema.parse(input);
    const [med] = await db.select().from(medications).where(eq(medications.id, data.medicationId)).limit(1);
    if (!med) throw new ForbiddenError("That medicine no longer exists.");
    requireCan(ctx, "doses.log", med.memberId);
    if (data.date > istDate()) throw new ForbiddenError("You can't mark a future day's dose.");
    if (!med.times.includes(data.time)) throw new ForbiddenError("That dose time isn't on the schedule.");

    await db.transaction(async (tx) => {
      const [existing] = await tx
        .select()
        .from(doseLogs)
        .where(and(eq(doseLogs.medicationId, med.id), eq(doseLogs.date, data.date), eq(doseLogs.time, data.time)))
        .limit(1);
      const wasTaken = existing?.status === "taken";
      if (data.status === "undo") {
        if (existing) await tx.delete(doseLogs).where(eq(doseLogs.id, existing.id));
      } else if (existing) {
        await tx.update(doseLogs).set({ status: data.status, loggedAt: new Date(), loggedBy: ctx.user.id }).where(eq(doseLogs.id, existing.id));
      } else {
        await tx.insert(doseLogs).values({ medicationId: med.id, memberId: med.memberId, date: data.date, time: data.time, status: data.status, loggedBy: ctx.user.id });
      }
      const nowTaken = data.status === "taken";
      if (med.pillsLeft != null && wasTaken !== nowTaken) {
        await tx
          .update(medications)
          .set({ pillsLeft: sql`greatest(0, ${medications.pillsLeft} + ${nowTaken ? -1 : 1})` })
          .where(eq(medications.id, med.id));
      }
    });

    let allDone = false;
    if (data.status === "taken" && data.date === istDate()) {
      const today = await getTodayDoses([med.memberId]);
      allDone = today.length > 0 && today.every((d) => d.state === "taken");
    }
    revalidatePath("/", "layout");
    const label = `${med.name} ${med.strength}`.trim();
    return {
      ok: true,
      data: { allDone },
      message: allDone ? `${label} taken. All medicines done today! +30 XP` : data.status === "taken" ? `${label} marked as taken` : data.status === "skipped" ? `${label} marked as skipped` : `Undone: ${label}`,
    };
  });
}
