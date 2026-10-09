import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { records } from "@/db/schema";
import { decrypt } from "@/lib/crypto";
import { resolveShare } from "@/lib/share";

/** Record files for "summary and records" links. Only while the link is live, only that person's files. */
export async function GET(_: Request, { params }: { params: Promise<{ token: string; recordId: string }> }) {
  const { token, recordId } = await params;
  const state = await resolveShare(token);
  if (state.status !== "ok" || state.link.scope !== "records" || !/^[0-9a-f-]{36}$/i.test(recordId)) return new Response("Not found", { status: 404 });
  const [rec] = await db.select({ fileData: records.fileData, mimeType: records.mimeType }).from(records).where(and(eq(records.id, recordId), eq(records.memberId, state.member.id))).limit(1);
  if (!rec?.fileData) return new Response("Not found", { status: 404 });
  return new Response(new Uint8Array(decrypt(rec.fileData)), {
    headers: {
      "Content-Type": rec.mimeType ?? "application/octet-stream",
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
      ...(rec.mimeType === "image/svg+xml" ? { "Content-Security-Policy": "default-src 'none'; style-src 'unsafe-inline'; sandbox" } : {}),
    },
  });
}
