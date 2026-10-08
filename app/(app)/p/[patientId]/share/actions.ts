"use server";

import { randomBytes } from "node:crypto";
import { and, eq, isNull } from "drizzle-orm";
import { refresh } from "next/cache";
import { db } from "@/db";
import { labResults, shareLinks } from "@/db/schema";
import { audit } from "@/lib/audit";
import { istDate } from "@/lib/dates";
import { requirePermission } from "@/lib/permissions";
import {
  labSchema,
  readForm,
  shareLinkRefSchema,
  shareLinkSchema,
  toFieldErrors,
  type FormState,
} from "@/lib/validators";

const LINK_DAYS = 7;

export async function addLabAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const raw = readForm(formData, ["patientId", "value", "takenOn"]);
  const parsed = labSchema.safeParse(raw);
  if (!parsed.success) return { fieldErrors: toFieldErrors(parsed.error), values: raw };
  const { patientId, value, takenOn } = parsed.data;
  if (takenOn > istDate(new Date())) return { fieldErrors: { takenOn: "share.error.date" }, values: raw };
  const { user } = await requirePermission(patientId, "log_labs");

  await db.insert(labResults).values({ patientId, loggedBy: user.id, kind: "hba1c", value, takenOn });
  refresh();
  return { ok: true, values: { value: String(value) } };
}

export async function createShareLinkAction(input: { patientId: string; includeMood: boolean }) {
  const parsed = shareLinkSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const };
  const { patientId } = parsed.data;
  const { user, permissions } = await requirePermission(patientId, "create_share_link");
  // Only someone who may see the weekly check result can put it on the link.
  const includeMood = parsed.data.includeMood && permissions.view_mood;

  const token = randomBytes(24).toString("base64url"); // 32 characters
  const expiresAt = new Date(Date.now() + LINK_DAYS * 24 * 60 * 60 * 1000);
  const [link] = await db
    .insert(shareLinks)
    .values({ patientId, token, expiresAt, includeMood, createdBy: user.id })
    .returning({ id: shareLinks.id });
  await audit({
    actorUserId: user.id,
    patientId,
    action: "share_link_created",
    detail: { linkId: link.id, includeMood, expiresAt: expiresAt.toISOString() },
  });
  refresh();
  return { ok: true as const, token };
}

export async function revokeShareLinkAction(input: { patientId: string; linkId: string }) {
  const parsed = shareLinkRefSchema.safeParse(input);
  if (!parsed.success) return { ok: false };
  const { patientId, linkId } = parsed.data;
  const { user } = await requirePermission(patientId, "create_share_link");
  const [row] = await db
    .update(shareLinks)
    .set({ revokedAt: new Date() })
    .where(and(eq(shareLinks.id, linkId), eq(shareLinks.patientId, patientId), isNull(shareLinks.revokedAt)))
    .returning({ id: shareLinks.id });
  if (!row) return { ok: false };
  await audit({ actorUserId: user.id, patientId, action: "share_link_revoked", detail: { linkId } });
  refresh();
  return { ok: true };
}
