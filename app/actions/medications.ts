"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { medications } from "@/db/schema";
import { runAction, type ActionResult } from "@/lib/action";
import { audit } from "@/lib/audit";
import { ForbiddenError, getContext, requireCan } from "@/lib/context";
import { checkInteractions, lookupGenerics, GENERIC_LABEL } from "@/lib/drugs";
import { firstName } from "@/lib/labels";
import { notify } from "@/lib/notify";
import { medicationSchema } from "@/lib/validators";

export async function saveMedication(input: unknown): Promise<ActionResult<{ id: string; warnings: string[] }>> {
  return runAction(async () => {
    const ctx = await getContext();
    const data = medicationSchema.parse(input);
    requireCan(ctx, "meds.manage", data.memberId);
    if (data.endDate && data.endDate < data.startDate) {
      return { ok: false, error: "The end date is before the start date.", fieldErrors: { endDate: "Must be after the start date" } };
    }
    const values = {
      memberId: data.memberId,
      name: data.name,
      genericName: data.genericName ?? (lookupGenerics(data.name).map((g) => GENERIC_LABEL[g]).join(" + ") || null),
      strength: data.strength,
      form: data.form,
      instructions: data.instructions,
      times: [...new Set(data.times)].sort(),
      startDate: data.startDate,
      endDate: data.endDate,
      pillsLeft: data.pillsLeft ?? null,
      refillAt: data.refillAt,
      prescribedBy: data.prescribedBy,
    };
    let id = data.id;
    if (id) {
      const [existing] = await db.select().from(medications).where(eq(medications.id, id)).limit(1);
      if (!existing) throw new ForbiddenError("That medicine no longer exists.");
      requireCan(ctx, "meds.manage", existing.memberId);
      await db.update(medications).set(values).where(eq(medications.id, id));
    } else {
      const [row] = await db.insert(medications).values({ ...values, createdBy: ctx.user.id }).returning({ id: medications.id });
      id = row.id;
    }

    // Check the person's full list for clashes and tell the care team about serious ones
    const active = await db.select().from(medications).where(eq(medications.memberId, data.memberId));
    const { interactions, duplicates } = checkInteractions(active.filter((m) => m.active).map((m) => ({ id: m.id, name: m.name, genericName: m.genericName })));
    const mine = interactions.filter((i) => i.first.id === id || i.second.id === id);
    const member = ctx.members.find((m) => m.id === data.memberId)!;
    for (const hit of mine.filter((i) => i.severity === "major")) {
      await notify({
        familyId: ctx.family.id,
        memberId: member.id,
        kind: "interaction",
        severity: "urgent",
        title: `${hit.first.name} + ${hit.second.name}: check with a doctor`,
        body: `${member.name}: ${hit.effect} ${hit.advice}`,
        href: `/medications?member=${member.id}#interactions`,
        dedupeKey: `int-${[hit.first.id, hit.second.id].sort().join("-")}`,
      });
    }
    const warnings = [
      ...mine.map((i) => `${i.first.name} + ${i.second.name}: ${i.effect}`),
      ...duplicates.filter((d) => d.medicines.some((m) => m.id === id)).map((d) => `Same ingredient twice: ${GENERIC_LABEL[d.generic]}`),
    ];
    await audit(ctx.family.id, ctx.user.id, data.id ? "medication.updated" : "medication.added", { member: member.name, name: data.name });
    revalidatePath("/", "layout");
    return {
      ok: true,
      message: data.id ? `${data.name} updated` : `${data.name} added for ${firstName(member.name)}`,
      data: { id, warnings },
    };
  });
}

export async function setMedicationActive(id: string, active: boolean): Promise<ActionResult> {
  return runAction(async () => {
    const ctx = await getContext();
    const [med] = await db.select().from(medications).where(eq(medications.id, id)).limit(1);
    if (!med) throw new ForbiddenError("That medicine no longer exists.");
    requireCan(ctx, "meds.manage", med.memberId);
    await db.update(medications).set({ active }).where(eq(medications.id, id));
    await audit(ctx.family.id, ctx.user.id, active ? "medication.resumed" : "medication.stopped", { name: med.name });
    revalidatePath("/", "layout");
    return { ok: true, message: active ? `${med.name} restarted` : `${med.name} stopped. It stays in the history.` };
  });
}

const refillInput = z.object({ id: z.string().uuid(), add: z.coerce.number().int().min(1).max(1000) });

export async function addRefill(input: unknown): Promise<ActionResult> {
  return runAction(async () => {
    const ctx = await getContext();
    const { id, add } = refillInput.parse(input);
    const [med] = await db.select().from(medications).where(eq(medications.id, id)).limit(1);
    if (!med) throw new ForbiddenError("That medicine no longer exists.");
    requireCan(ctx, "meds.manage", med.memberId);
    const pillsLeft = (med.pillsLeft ?? 0) + add;
    await db.update(medications).set({ pillsLeft }).where(eq(medications.id, id));
    revalidatePath("/", "layout");
    return { ok: true, message: `${med.name}: ${pillsLeft} now in stock` };
  });
}

export async function deleteMedication(id: string): Promise<ActionResult> {
  return runAction(async () => {
    const ctx = await getContext();
    const [med] = await db.select().from(medications).where(eq(medications.id, id)).limit(1);
    if (!med) throw new ForbiddenError("That medicine no longer exists.");
    requireCan(ctx, "meds.manage", med.memberId);
    await db.delete(medications).where(eq(medications.id, id));
    await audit(ctx.family.id, ctx.user.id, "medication.deleted", { name: med.name });
    revalidatePath("/", "layout");
    return { ok: true, message: `${med.name} deleted with its dose history` };
  });
}
