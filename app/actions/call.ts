"use server";

import { and, eq, isNull } from "drizzle-orm";
import { db } from "@/db";
import { callLogs, memberships } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { requirePermission } from "@/lib/permissions";
import { nowSeconds, signToken } from "@/lib/signaling";
import { callEndSchema, callStartSchema, callTicketSchema } from "@/lib/validators";

/** Lets the signed-in user register with the signaling server for 10 minutes. */
export async function getSignalingToken() {
  const user = await requireUser();
  const url = process.env.NEXT_PUBLIC_SIGNALING_URL;
  if (!url || !process.env.SIGNALING_SECRET) return null;
  return { url, token: signToken({ userId: user.id, name: user.name, exp: nowSeconds() + 10 * 60 }) };
}

/**
 * A 60-second ticket to call one person. Both users must be members of this
 * patient's family, so calling someone outside the family fails here.
 */
export async function getCallTicket(input: { patientId: string; targetUserId: string }) {
  const parsed = callTicketSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, error: "call.error.notFamily" as const };
  const { patientId, targetUserId } = parsed.data;
  const { user } = await requirePermission(patientId, "start_call");
  const [target] = await db
    .select({ id: memberships.id })
    .from(memberships)
    .where(and(eq(memberships.patientId, patientId), eq(memberships.userId, targetUserId)))
    .limit(1);
  if (!target || targetUserId === user.id) return { ok: false as const, error: "call.error.notFamily" as const };
  return {
    ok: true as const,
    ticket: signToken({ from: user.id, to: targetUserId, patientId, exp: nowSeconds() + 60 }),
  };
}

/** STUN and TURN from env, never hard-coded in the client. */
export async function getIceServers(): Promise<RTCIceServer[]> {
  await requireUser();
  const servers: RTCIceServer[] = [];
  const stun = (process.env.STUN_URLS ?? "").split(",").map((s) => s.trim()).filter(Boolean);
  if (stun.length) servers.push({ urls: stun });
  if (process.env.TURN_URL) {
    servers.push({
      urls: process.env.TURN_URL.split(",").map((s) => s.trim()),
      username: process.env.TURN_USERNAME,
      credential: process.env.TURN_CREDENTIAL,
    });
  }
  return servers;
}

export async function logCallStart(input: { patientId: string; calleeId: string; video: boolean }) {
  const parsed = callStartSchema.safeParse(input);
  if (!parsed.success) return null;
  const { patientId, calleeId, video } = parsed.data;
  const { user } = await requirePermission(patientId, "start_call");
  const [row] = await db
    .insert(callLogs)
    .values({ patientId, callerId: user.id, calleeId, video })
    .returning({ id: callLogs.id });
  return row.id;
}

export async function logCallEnd(input: { callId: string }) {
  const parsed = callEndSchema.safeParse(input);
  if (!parsed.success) return;
  const user = await requireUser();
  await db
    .update(callLogs)
    .set({ endedAt: new Date() })
    .where(and(eq(callLogs.id, parsed.data.callId), eq(callLogs.callerId, user.id), isNull(callLogs.endedAt)));
}
