import "server-only";
import { eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { members, shareLinks, type Member, type ShareLink } from "@/db/schema";

export type ShareState = { status: "ok"; link: ShareLink; member: Member } | { status: "expired" | "revoked" | "missing" };

/** Resolves a share token. Expired and revoked links never show data. */
export async function resolveShare(token: string, countView = false): Promise<ShareState> {
  if (!/^[\w-]{10,64}$/.test(token)) return { status: "missing" };
  const [link] = await db.select().from(shareLinks).where(eq(shareLinks.token, token)).limit(1);
  if (!link) return { status: "missing" };
  if (link.revokedAt) return { status: "revoked" };
  if (link.expiresAt.getTime() < Date.now()) return { status: "expired" };
  const [member] = await db.select().from(members).where(eq(members.id, link.memberId)).limit(1);
  if (!member) return { status: "missing" };
  if (countView) {
    await db.update(shareLinks).set({ viewCount: sql`${shareLinks.viewCount} + 1`, lastViewedAt: new Date() }).where(eq(shareLinks.id, link.id));
  }
  return { status: "ok", link, member };
}
