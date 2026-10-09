"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { vitals } from "@/db/schema";
import { runAction, type ActionResult } from "@/lib/action";
import { audit } from "@/lib/audit";
import { getContext, requireCan, ForbiddenError } from "@/lib/context";
import { formatTime } from "@/lib/dates";
import { firstName } from "@/lib/labels";
import { notify } from "@/lib/notify";
import { vitalSchema } from "@/lib/validators";
import { classify, formatReading, isAlarming, VITAL_META } from "@/lib/vitals";

export async function addVital(input: unknown): Promise<ActionResult<{ status: string; label: string }>> {
  return runAction(async () => {
    const ctx = await getContext();
    const data = vitalSchema.parse(input);
    requireCan(ctx, "vitals.log", data.memberId);
    const member = ctx.members.find((m) => m.id === data.memberId)!;
    const now = new Date();
    const [row] = await db
      .insert(vitals)
      .values({
        memberId: data.memberId,
        kind: data.kind,
        value: data.value,
        value2: data.kind === "bp" ? data.value2 ?? null : null,
        context: data.kind === "sugar" ? data.context ?? "random" : null,
        note: data.note,
        measuredAt: now,
        loggedBy: ctx.user.id,
      })
      .returning();
    const reading = { kind: data.kind, value: data.value, value2: data.value2, context: data.context };
    const c = classify(reading);
    const meta = VITAL_META[data.kind];
    const shown = `${formatReading(reading)} ${meta.unit}`;
    if (isAlarming(reading)) {
      await notify({
        familyId: ctx.family.id,
        memberId: member.id,
        kind: "abnormal_vital",
        severity: "warning",
        title: `${firstName(member.name)}'s ${meta.label.toLowerCase()} is ${c.label.toLowerCase()}`,
        body: `${member.name} · ${c.label} · ${shown} at ${formatTime(now)}. Recheck after resting 5 minutes. Recorded by ${firstName(ctx.user.name)}.`,
        href: `/members/${member.id}?tab=vitals`,
        dedupeKey: `vital-${row.id}`,
      });
    }
    revalidatePath("/", "layout");
    return {
      ok: true,
      message: `${meta.label} saved: ${c.label} · ${shown}`,
      data: { status: c.status, label: c.label },
    };
  });
}

export async function deleteVital(id: string): Promise<ActionResult> {
  return runAction(async () => {
    const ctx = await getContext();
    const [row] = await db.select().from(vitals).where(eq(vitals.id, id)).limit(1);
    if (!row) throw new ForbiddenError("That reading was already removed.");
    requireCan(ctx, "vitals.log", row.memberId);
    await db.delete(vitals).where(eq(vitals.id, id));
    await audit(ctx.family.id, ctx.user.id, "vital.deleted", { kind: row.kind, memberId: row.memberId });
    revalidatePath("/", "layout");
    return { ok: true, message: "Reading removed" };
  });
}
