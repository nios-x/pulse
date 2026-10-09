import { eq } from "drizzle-orm";
import { db } from "@/db";
import { doctors, records } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";
import { hasDoctorAccess } from "@/lib/doctor";
import { decrypt } from "@/lib/crypto";
import { getContext, allowed } from "@/lib/context";

/** Streams a decrypted record file to a family member who may view it. */
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) return new Response("Not found", { status: 404 });
  const user = await getCurrentUser();
  if (!user) return new Response("Sign in to view this record.", { status: 401 });
  const [rec] = await db.select({ memberId: records.memberId, fileData: records.fileData, mimeType: records.mimeType, fileName: records.fileName }).from(records).where(eq(records.id, id)).limit(1);
  if (!rec?.fileData) return new Response("Not found", { status: 404 });
  if (user.isDoctor) {
    // Doctors may open files only for patients who currently share with them
    const [doc] = await db.select({ id: doctors.id }).from(doctors).where(eq(doctors.userId, user.id)).limit(1);
    if (!doc || !(await hasDoctorAccess(doc.id, rec.memberId))) return new Response("This patient's access has expired.", { status: 403 });
  } else {
    const ctx = await getContext();
    if (!ctx.members.some((m) => m.id === rec.memberId)) return new Response("Not found", { status: 404 });
    if (!allowed(ctx, "records.view", rec.memberId)) return new Response("You don't have access to this record.", { status: 403 });
  }
  const body = decrypt(rec.fileData);
  const download = new URL(request.url).searchParams.has("download");
  return new Response(new Uint8Array(body), {
    headers: {
      "Content-Type": rec.mimeType ?? "application/octet-stream",
      "Content-Disposition": `${download ? "attachment" : "inline"}; filename="${(rec.fileName ?? "record").replace(/[^\w.\- ]/g, "_")}"`,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
      // Seeded sample documents are SVG: render them as inert documents with no scripts
      ...(rec.mimeType === "image/svg+xml" ? { "Content-Security-Policy": "default-src 'none'; style-src 'unsafe-inline'; sandbox" } : {}),
    },
  });
}
