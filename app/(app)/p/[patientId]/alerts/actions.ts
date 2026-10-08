"use server";

import { and, eq, isNull } from "drizzle-orm";
import { refresh } from "next/cache";
import { db } from "@/db";
import { alerts } from "@/db/schema";
import { countUnread } from "@/lib/alerts";
import { requirePermission } from "@/lib/permissions";
import { alertRefSchema, patientRefSchema } from "@/lib/validators";

/** Polled by the bell every 30 seconds. */
export async function unreadAlertCountAction(input: { patientId: string }): Promise<number> {
  const parsed = patientRefSchema.safeParse(input);
  if (!parsed.success) return 0;
  const { membership } = await requirePermission(parsed.data.patientId, "receive_alerts");
  return countUnread(parsed.data.patientId, membership.role);
}

/** "Seen, I'm on it": one person acknowledging clears it for the family. */
export async function ackAlertAction(input: { patientId: string; alertId: string }) {
  const parsed = alertRefSchema.safeParse(input);
  if (!parsed.success) return { ok: false };
  const { patientId, alertId } = parsed.data;
  const { user } = await requirePermission(patientId, "receive_alerts");
  await db
    .update(alerts)
    .set({ ackBy: user.id, ackAt: new Date() })
    .where(and(eq(alerts.id, alertId), eq(alerts.patientId, patientId), isNull(alerts.ackAt)));
  refresh();
  return { ok: true };
}
