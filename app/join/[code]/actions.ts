"use server";

import { and, eq, gt, isNull } from "drizzle-orm";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { invites, memberships } from "@/db/schema";
import { audit } from "@/lib/audit";
import { requireUser } from "@/lib/auth";
import { SCOPES } from "@/lib/permissions";
import { inviteCodeSchema, readForm, type FormState } from "@/lib/validators";

export async function acceptInviteAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser();
  const parsed = inviteCodeSchema.safeParse(readForm(formData, ["code"]).code);
  if (!parsed.success) return { error: "join.error.invalid" };
  const code = parsed.data;

  const result = await db.transaction(async (tx) => {
    // Lock the invite row so two people can't use one code at the same moment.
    const [invite] = await tx
      .select()
      .from(invites)
      .where(and(eq(invites.code, code), isNull(invites.usedAt), gt(invites.expiresAt, new Date())))
      .for("update")
      .limit(1);
    if (!invite) return { error: "join.error.invalid" as const };

    const [already] = await tx
      .select({ id: memberships.id })
      .from(memberships)
      .where(and(eq(memberships.patientId, invite.patientId), eq(memberships.userId, user.id)))
      .limit(1);
    if (already) return { error: "join.error.already" as const, patientId: invite.patientId };

    if (invite.role === "owner") {
      const [owner] = await tx
        .select({ id: memberships.id })
        .from(memberships)
        .where(and(eq(memberships.patientId, invite.patientId), eq(memberships.role, "owner")))
        .limit(1);
      if (owner) return { error: "join.error.ownerTaken" as const };
    }

    const scopes = invite.role === "owner" ? [...SCOPES] : invite.scopes;
    await tx
      .insert(memberships)
      .values({ patientId: invite.patientId, userId: user.id, role: invite.role, scopes });
    await tx
      .update(invites)
      .set({ usedAt: new Date(), usedBy: user.id })
      .where(eq(invites.id, invite.id));
    await audit(
      {
        actorUserId: user.id,
        patientId: invite.patientId,
        action: "member_joined",
        detail: { role: invite.role, scopes, inviteId: invite.id },
      },
      tx
    );
    return { patientId: invite.patientId };
  });

  if ("error" in result && result.error) return { error: result.error };
  redirect(`/home?p=${result.patientId}`);
}
