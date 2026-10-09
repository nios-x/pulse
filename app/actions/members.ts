"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { members, type Role } from "@/db/schema";
import { runAction, type ActionResult } from "@/lib/action";
import { audit } from "@/lib/audit";
import { ForbiddenError, getContext, requireCan } from "@/lib/context";
import { ROLE_LABEL } from "@/lib/permissions";
import { healthInfoSchema, memberSchema } from "@/lib/validators";

export async function saveMember(input: unknown): Promise<ActionResult<{ id: string }>> {
  return runAction(async () => {
    const ctx = await getContext();
    const data = memberSchema.parse(input);
    if (data.id) {
      requireCan(ctx, "member.edit", data.id);
      const target = ctx.members.find((m) => m.id === data.id)!;
      // Role changes go through setRole (admin only)
      await db
        .update(members)
        .set({
          name: data.name,
          relation: target.relation === "self" ? "self" : data.relation,
          dateOfBirth: data.dateOfBirth,
          sex: data.sex,
          bloodGroup: data.bloodGroup,
          heightCm: data.heightCm ?? null,
          phone: data.phone,
        })
        .where(eq(members.id, data.id));
      await audit(ctx.family.id, ctx.user.id, "member.updated", { member: data.name });
      revalidatePath("/", "layout");
      return { ok: true, message: `${data.name}'s profile saved`, data: { id: data.id } };
    }
    requireCan(ctx, "member.add");
    const [row] = await db
      .insert(members)
      .values({
        familyId: ctx.family.id,
        name: data.name,
        relation: data.relation === "self" ? "other" : data.relation,
        role: data.role,
        dateOfBirth: data.dateOfBirth,
        sex: data.sex,
        bloodGroup: data.bloodGroup,
        heightCm: data.heightCm ?? null,
        phone: data.phone,
        avatarTone: 1 + (ctx.members.length % 6),
      })
      .returning({ id: members.id });
    await audit(ctx.family.id, ctx.user.id, "member.added", { member: data.name, relation: data.relation });
    revalidatePath("/", "layout");
    return { ok: true, message: `${data.name} added to the family`, data: { id: row.id } };
  });
}

export async function saveHealthInfo(input: unknown): Promise<ActionResult> {
  return runAction(async () => {
    const ctx = await getContext();
    const data = healthInfoSchema.parse(input);
    requireCan(ctx, "member.edit", data.memberId);
    await db
      .update(members)
      .set({ allergies: data.allergies, conditions: data.conditions, emergencyContacts: data.emergencyContacts, notes: data.notes })
      .where(eq(members.id, data.memberId));
    await audit(ctx.family.id, ctx.user.id, "member.health_info_updated", { memberId: data.memberId });
    revalidatePath("/", "layout");
    return { ok: true, message: "Health details saved" };
  });
}

const roleInput = z.object({ memberId: z.string().uuid(), role: z.enum(["admin", "caregiver", "member", "viewer"]) });

export async function setRole(input: unknown): Promise<ActionResult> {
  return runAction(async () => {
    const ctx = await getContext();
    const { memberId, role } = roleInput.parse(input);
    requireCan(ctx, "family.manage");
    const target = ctx.members.find((m) => m.id === memberId);
    if (!target) throw new ForbiddenError("That person isn't in your family.");
    const admins = ctx.members.filter((m) => m.role === "admin" && m.userId);
    if (target.role === "admin" && role !== "admin" && admins.length <= 1 && target.userId) {
      throw new ForbiddenError("A family needs at least one admin. Make someone else admin first.");
    }
    await db.update(members).set({ role: role as Role }).where(eq(members.id, memberId));
    await audit(ctx.family.id, ctx.user.id, "member.role_changed", { member: target.name, from: target.role, to: role });
    revalidatePath("/", "layout");
    return { ok: true, message: `${target.name} is now ${ROLE_LABEL[role]}` };
  });
}

const assignInput = z.object({ memberId: z.string().uuid(), assigned: z.array(z.string().uuid()).max(20) });

export async function setAssignments(input: unknown): Promise<ActionResult> {
  return runAction(async () => {
    const ctx = await getContext();
    const { memberId, assigned } = assignInput.parse(input);
    requireCan(ctx, "family.manage");
    const valid = assigned.filter((id) => id !== memberId && ctx.members.some((m) => m.id === id));
    await db
      .update(members)
      .set({ assignedMemberIds: valid })
      .where(and(eq(members.id, memberId), eq(members.familyId, ctx.family.id)));
    const target = ctx.members.find((m) => m.id === memberId);
    await audit(ctx.family.id, ctx.user.id, "member.assignments_changed", { member: target?.name, count: valid.length });
    revalidatePath("/", "layout");
    return { ok: true, message: `Updated who ${target?.name.split(" ")[0]} looks after` };
  });
}

export async function removeMember(memberId: string): Promise<ActionResult> {
  return runAction(async () => {
    const ctx = await getContext();
    requireCan(ctx, "family.manage");
    if (memberId === ctx.self.id) throw new ForbiddenError("You can't remove yourself.");
    const target = ctx.members.find((m) => m.id === memberId);
    if (!target) throw new ForbiddenError("That person isn't in your family.");
    await db.delete(members).where(eq(members.id, memberId));
    await audit(ctx.family.id, ctx.user.id, "member.removed", { member: target.name });
    revalidatePath("/", "layout");
    return { ok: true, message: `${target.name} and their records were removed` };
  });
}
