import "server-only";
import { and, eq, gt, isNull } from "drizzle-orm";
import { db } from "@/db";
import { invites, members } from "@/db/schema";
import { audit } from "@/lib/audit";

/** Joins the invite's family: links an existing profile or creates a new one. Single use, expires. */
export async function acceptInvite(
  rawCode: string,
  user: { id: string; name: string; email: string }
): Promise<{ ok: true; familyId: string } | { ok: false; error: string }> {
  const code = rawCode.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
  const [existing] = await db.select({ id: members.id }).from(members).where(eq(members.userId, user.id)).limit(1);
  if (existing) return { ok: false, error: "You're already part of a family." };
  return db.transaction(async (tx) => {
    const [inv] = await tx
      .select()
      .from(invites)
      .where(and(eq(invites.code, code), isNull(invites.usedAt), gt(invites.expiresAt, new Date())))
      .limit(1)
      .for("update");
    if (!inv) return { ok: false as const, error: "That invite code isn't valid or has expired. Ask your family admin for a new one." };
    if (inv.email && inv.email !== user.email.toLowerCase()) {
      return { ok: false as const, error: `This invite is for ${inv.email}. Sign up with that email, or ask for a new code.` };
    }
    if (inv.memberId) {
      const [profile] = await tx.select().from(members).where(eq(members.id, inv.memberId)).limit(1);
      if (!profile || profile.userId) return { ok: false as const, error: "That profile is already linked to someone." };
      await tx.update(members).set({ userId: user.id, role: inv.role }).where(eq(members.id, inv.memberId));
    } else {
      await tx.insert(members).values({ familyId: inv.familyId, userId: user.id, name: user.name, relation: "other", role: inv.role, avatarTone: 1 + Math.floor(Math.random() * 6) });
    }
    await tx.update(invites).set({ usedAt: new Date(), usedBy: user.id }).where(eq(invites.id, inv.id));
    await audit(inv.familyId, user.id, "invite.accepted", { role: inv.role, code: inv.code });
    return { ok: true as const, familyId: inv.familyId };
  });
}
