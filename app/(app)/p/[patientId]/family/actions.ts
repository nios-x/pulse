"use server";

import { and, eq } from "drizzle-orm";
import { refresh } from "next/cache";
import { db } from "@/db";
import { invites, memberships, type Scope } from "@/db/schema";
import { audit } from "@/lib/audit";
import { createT } from "@/lib/i18n";
import { getLocale } from "@/lib/i18n-server";
import { generateInviteCode, INVITE_TTL_HOURS, whatsappShareUrl } from "@/lib/invites";
import { originUrl } from "@/lib/origin";
import { requirePermission, SCOPES } from "@/lib/permissions";
import {
  inviteRefSchema,
  inviteSchema,
  memberRefSchema,
  memberRoleSchema,
  memberScopesSchema,
  type FormState,
} from "@/lib/validators";

type Result = { ok: true } | { ok: false; error: "family.error.notAllowed" | "common.error" };

/** Mood stays off until the patient turns it on: only the owner can change it. */
function keepMoodUnlessOwner(next: Scope[], previous: readonly Scope[], actorIsOwner: boolean): Scope[] {
  if (actorIsOwner) return next;
  const withoutMood = next.filter((s) => s !== "mood");
  return previous.includes("mood") ? [...withoutMood, "mood"] : withoutMood;
}

export async function createInviteAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = inviteSchema.safeParse({
    patientId: formData.get("patientId"),
    role: formData.get("role"),
    scopes: formData.getAll("scopes"),
  });
  if (!parsed.success) return { error: "common.error" };
  const { patientId, role } = parsed.data;
  const { user, membership, patient, ctx } = await requirePermission(patientId, "manage_members");

  // Only one owner, and only the patient can be invited as owner.
  if (role === "owner" && ctx.patientHasOwner) return { error: "family.error.ownerExists" };
  const actorIsOwner = membership.role === "owner";
  const scopes =
    role === "owner" ? [...SCOPES] : keepMoodUnlessOwner(parsed.data.scopes, [], actorIsOwner);

  const expiresAt = new Date(Date.now() + INVITE_TTL_HOURS * 60 * 60 * 1000);
  let code = "";
  for (let attempt = 0; attempt < 5 && !code; attempt++) {
    const candidate = generateInviteCode();
    const [row] = await db
      .insert(invites)
      .values({ patientId, code: candidate, role, scopes, expiresAt, createdBy: user.id })
      .onConflictDoNothing({ target: invites.code })
      .returning({ code: invites.code });
    if (row) code = row.code;
  }
  if (!code) return { error: "common.error" };

  await audit({ actorUserId: user.id, patientId, action: "invite_created", detail: { code, role, scopes } });

  const t = createT(await getLocale());
  const url = `${await originUrl()}/join/${code}`;
  const message = t("invite.whatsappText", { name: user.name, patient: patient.name, code, url });
  refresh();
  return { ok: true, values: { code, role, url, whatsapp: whatsappShareUrl(message) } };
}

export async function revokeInviteAction(input: { patientId: string; inviteId: string }): Promise<Result> {
  const parsed = inviteRefSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "common.error" };
  const { patientId, inviteId } = parsed.data;
  const { user } = await requirePermission(patientId, "manage_members");
  const [row] = await db
    .update(invites)
    .set({ expiresAt: new Date() })
    .where(and(eq(invites.id, inviteId), eq(invites.patientId, patientId)))
    .returning({ code: invites.code });
  if (!row) return { ok: false, error: "common.error" };
  await audit({ actorUserId: user.id, patientId, action: "invite_revoked", detail: { code: row.code } });
  refresh();
  return { ok: true };
}

/** Loads a member the actor may change: same patient, not the owner, not themselves. */
async function loadTarget(patientId: string, membershipId: string, actorId: string) {
  const [target] = await db
    .select()
    .from(memberships)
    .where(and(eq(memberships.id, membershipId), eq(memberships.patientId, patientId)))
    .limit(1);
  if (!target || target.role === "owner" || target.userId === actorId) return null;
  return target;
}

export async function updateMemberRoleAction(input: {
  patientId: string;
  membershipId: string;
  role: "caregiver" | "family";
}): Promise<Result> {
  const parsed = memberRoleSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "common.error" };
  const { patientId, membershipId, role } = parsed.data;
  const { user } = await requirePermission(patientId, "manage_members");
  const target = await loadTarget(patientId, membershipId, user.id);
  if (!target) return { ok: false, error: "family.error.notAllowed" };
  if (target.role === role) return { ok: true };

  await db.update(memberships).set({ role }).where(eq(memberships.id, target.id));
  await audit({
    actorUserId: user.id,
    patientId,
    action: "role_changed",
    detail: { userId: target.userId, from: target.role, to: role },
  });
  refresh();
  return { ok: true };
}

export async function updateMemberScopesAction(input: {
  patientId: string;
  membershipId: string;
  scopes: Scope[];
}): Promise<Result> {
  const parsed = memberScopesSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "common.error" };
  const { patientId, membershipId } = parsed.data;
  const { user, membership } = await requirePermission(patientId, "manage_members");
  const target = await loadTarget(patientId, membershipId, user.id);
  if (!target) return { ok: false, error: "family.error.notAllowed" };

  const scopes = keepMoodUnlessOwner(parsed.data.scopes, target.scopes, membership.role === "owner");
  await db.update(memberships).set({ scopes }).where(eq(memberships.id, target.id));
  await audit({
    actorUserId: user.id,
    patientId,
    action: "scopes_changed",
    detail: { userId: target.userId, from: target.scopes, to: scopes },
  });
  refresh();
  return { ok: true };
}

export async function removeMemberAction(input: { patientId: string; membershipId: string }): Promise<Result> {
  const parsed = memberRefSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "common.error" };
  const { patientId, membershipId } = parsed.data;
  const { user } = await requirePermission(patientId, "manage_members");
  const target = await loadTarget(patientId, membershipId, user.id);
  if (!target) return { ok: false, error: "family.error.notAllowed" };

  await db.delete(memberships).where(eq(memberships.id, target.id));
  await audit({
    actorUserId: user.id,
    patientId,
    action: "member_removed",
    detail: { userId: target.userId, role: target.role, scopes: target.scopes },
  });
  refresh();
  return { ok: true };
}
