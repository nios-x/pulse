"use server";

import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { pushSubscriptions } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { getLocale } from "@/lib/i18n-server";
import { pushEndpointSchema, pushSubscriptionSchema } from "@/lib/validators";

/** Saves this phone's push subscription for the signed-in user, in their current language. */
export async function savePushSubscriptionAction(input: { endpoint: string; keys: { p256dh: string; auth: string } }) {
  const parsed = pushSubscriptionSchema.safeParse(input);
  if (!parsed.success) return { ok: false };
  const user = await requireUser();
  const locale = await getLocale();
  const { endpoint, keys } = parsed.data;
  await db
    .insert(pushSubscriptions)
    .values({ userId: user.id, endpoint, keys, locale })
    .onConflictDoUpdate({ target: pushSubscriptions.endpoint, set: { userId: user.id, keys, locale } });
  return { ok: true };
}

export async function deletePushSubscriptionAction(input: { endpoint: string }) {
  const parsed = pushEndpointSchema.safeParse(input);
  if (!parsed.success) return { ok: false };
  const user = await requireUser();
  await db
    .delete(pushSubscriptions)
    .where(and(eq(pushSubscriptions.endpoint, parsed.data.endpoint), eq(pushSubscriptions.userId, user.id)));
  return { ok: true };
}
