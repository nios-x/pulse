import "server-only";
import { and, eq, gt, isNull } from "drizzle-orm";
import { db } from "@/db";
import { invites, memberships, patients, users } from "@/db/schema";
import { audit } from "@/lib/audit";
import { SCOPES } from "@/lib/permissions";

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

export type RedeemResult =
  | { patientId: string; error?: undefined }
  | { error: "join.error.invalid" | "join.error.already" | "join.error.ownerTaken"; patientId?: string };

/** An unused, unexpired invite with who sent it, for the join and sign-up screens. */
export async function findActiveInvite(code: string) {
  const [invite] = await db
    .select({
      role: invites.role,
      scopes: invites.scopes,
      patientId: invites.patientId,
      patientName: patients.name,
      inviterName: users.name,
    })
    .from(invites)
    .innerJoin(patients, eq(invites.patientId, patients.id))
    .leftJoin(users, eq(invites.createdBy, users.id))
    .where(and(eq(invites.code, code), isNull(invites.usedAt), gt(invites.expiresAt, new Date())))
    .limit(1);
  return invite ?? null;
}

/**
 * Uses an invite code for `userId` inside `tx`: adds the membership and marks the code used.
 * Call it in the same transaction that creates the user, so nobody gets an account without one.
 */
export async function redeemInvite(tx: Tx, code: string, userId: string): Promise<RedeemResult> {
  // Lock the invite row so two people can't use one code at the same moment.
  const [invite] = await tx
    .select()
    .from(invites)
    .where(and(eq(invites.code, code), isNull(invites.usedAt), gt(invites.expiresAt, new Date())))
    .for("update")
    .limit(1);
  if (!invite) return { error: "join.error.invalid" };

  const [already] = await tx
    .select({ id: memberships.id })
    .from(memberships)
    .where(and(eq(memberships.patientId, invite.patientId), eq(memberships.userId, userId)))
    .limit(1);
  if (already) return { error: "join.error.already", patientId: invite.patientId };

  if (invite.role === "owner") {
    const [owner] = await tx
      .select({ id: memberships.id })
      .from(memberships)
      .where(and(eq(memberships.patientId, invite.patientId), eq(memberships.role, "owner")))
      .limit(1);
    if (owner) return { error: "join.error.ownerTaken" };
  }

  const scopes = invite.role === "owner" ? [...SCOPES] : invite.scopes;
  await tx
    .insert(memberships)
    .values({ patientId: invite.patientId, userId, role: invite.role, scopes });
  // Whoever joins as a family's doctor gets the doctor home from now on.
  if (invite.role === "doctor") await tx.update(users).set({ isDoctor: true }).where(eq(users.id, userId));
  await tx
    .update(invites)
    .set({ usedAt: new Date(), usedBy: userId })
    .where(eq(invites.id, invite.id));
  await audit(
    {
      actorUserId: userId,
      patientId: invite.patientId,
      action: "member_joined",
      detail: { role: invite.role, scopes, inviteId: invite.id },
    },
    tx
  );
  return { patientId: invite.patientId };
}
