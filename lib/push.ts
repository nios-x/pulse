import webpush from "web-push";
import { eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { pushSubscriptions } from "@/db/schema";

export type PushPayload = { title: string; body: string; url: string; tag: string };

let configured = false;
function configure(): boolean {
  if (configured) return true;
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  if (!publicKey || !privateKey) return false;
  webpush.setVapidDetails(process.env.VAPID_SUBJECT ?? "mailto:team@pulse.example", publicKey, privateKey);
  configured = true;
  return true;
}

export function pushConfigured(): boolean {
  return configure();
}

/** Sends one notification. Subscriptions the push service says are gone get deleted. */
export async function sendPush(
  sub: { endpoint: string; keys: { p256dh: string; auth: string } },
  payload: PushPayload
): Promise<"sent" | "gone" | "failed"> {
  if (!configure()) return "failed";
  try {
    await webpush.sendNotification(sub, JSON.stringify(payload), { TTL: 60 * 60, urgency: "high" });
    return "sent";
  } catch (err) {
    const status = (err as { statusCode?: number }).statusCode;
    if (status === 404 || status === 410) {
      await db.delete(pushSubscriptions).where(eq(pushSubscriptions.endpoint, sub.endpoint));
      return "gone";
    }
    console.error("push failed", status ?? err);
    return "failed";
  }
}

/** Pushes to every phone of these users, each in the language they subscribed with. */
export async function pushToUsers(
  userIds: string[],
  build: (locale: "en" | "hi") => PushPayload
): Promise<void> {
  if (userIds.length === 0 || !configure()) return;
  const subs = await db
    .select({ endpoint: pushSubscriptions.endpoint, keys: pushSubscriptions.keys, locale: pushSubscriptions.locale })
    .from(pushSubscriptions)
    .where(inArray(pushSubscriptions.userId, userIds));
  await Promise.all(subs.map((s) => sendPush(s, build(s.locale === "en" ? "en" : "hi"))));
}
