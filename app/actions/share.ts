"use server";

import { revalidatePath } from "next/cache";
import { and, eq, gt, isNull } from "drizzle-orm";
import { db } from "@/db";
import { shareLinks } from "@/db/schema";
import { runAction, type ActionResult } from "@/lib/action";
import { audit } from "@/lib/audit";
import { randomToken } from "@/lib/crypto";
import { ForbiddenError, getContext, requireCan } from "@/lib/context";
import { appUrl } from "@/lib/email-templates";
import { shareSchema } from "@/lib/validators";

const SCOPE_LABEL = { emergency: "Emergency card", summary: "Health summary", records: "Summary and records" } as const;

/** A time-limited, revocable link. The person creating it confirms consent first. */
export async function createShareLink(input: unknown): Promise<ActionResult<{ url: string }>> {
  return runAction(async () => {
    const ctx = await getContext();
    const data = shareSchema.parse(input);
    requireCan(ctx, "sharing.manage", data.memberId);
    const token = randomToken(24);
    const expiresAt = new Date(Date.now() + data.hours * 3_600_000);
    await db.insert(shareLinks).values({
      familyId: ctx.family.id,
      memberId: data.memberId,
      token,
      scope: data.scope,
      label: data.label ?? SCOPE_LABEL[data.scope],
      expiresAt,
      createdBy: ctx.user.id,
    });
    const member = ctx.members.find((m) => m.id === data.memberId)!;
    await audit(ctx.family.id, ctx.user.id, "share.created", { member: member.name, scope: data.scope, hours: data.hours, label: data.label, consent: true });
    revalidatePath("/", "layout");
    return { ok: true, message: `Link ready. It stops working after ${data.hours < 48 ? `${data.hours} hours` : `${Math.round(data.hours / 24)} days`}.`, data: { url: appUrl(`/share/${token}`) } };
  });
}

/** Emergency QR: reuse a live emergency link, or create one for 1 year. */
export async function ensureEmergencyLink(memberId: string): Promise<ActionResult<{ url: string }>> {
  return runAction(async () => {
    const ctx = await getContext();
    requireCan(ctx, "sharing.manage", memberId);
    const [live] = await db
      .select()
      .from(shareLinks)
      .where(and(eq(shareLinks.memberId, memberId), eq(shareLinks.scope, "emergency"), isNull(shareLinks.revokedAt), gt(shareLinks.expiresAt, new Date())))
      .limit(1);
    if (live) return { ok: true, data: { url: appUrl(`/share/${live.token}`) } };
    return createShareLink({ memberId, scope: "emergency", hours: 24 * 365, label: "Emergency card QR", consent: "on" });
  });
}

export async function revokeShareLink(id: string): Promise<ActionResult> {
  return runAction(async () => {
    const ctx = await getContext();
    const [link] = await db.select().from(shareLinks).where(eq(shareLinks.id, id)).limit(1);
    if (!link || link.familyId !== ctx.family.id) throw new ForbiddenError("That link doesn't exist.");
    requireCan(ctx, "sharing.manage", link.memberId);
    await db.update(shareLinks).set({ revokedAt: new Date() }).where(eq(shareLinks.id, id));
    await audit(ctx.family.id, ctx.user.id, "share.revoked", { label: link.label, scope: link.scope });
    revalidatePath("/", "layout");
    return { ok: true, message: "Link turned off. Anyone who has it can no longer open it." };
  });
}
