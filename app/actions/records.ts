"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { records } from "@/db/schema";
import { runAction, type ActionResult } from "@/lib/action";
import { audit } from "@/lib/audit";
import { encrypt } from "@/lib/crypto";
import { ForbiddenError, getContext, requireCan } from "@/lib/context";
import { istDate } from "@/lib/dates";
import { detectFileType, MAX_UPLOAD_BYTES } from "@/lib/files";

const recordInput = z.object({
  memberId: z.string().uuid("Choose who this record belongs to"),
  type: z.enum(["lab_report", "prescription", "scan", "discharge", "vaccination", "other"]),
  title: z.string().trim().min(2, "Give the record a short name").max(120),
  recordDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Pick the date on the report"),
  provider: z.string().trim().max(120).optional(),
  notes: z.string().trim().max(1000).optional(),
});

/** Saves a record. The file is checked by its real bytes and stored encrypted (AES-256-GCM). */
export async function uploadRecord(form: FormData): Promise<ActionResult<{ id: string }>> {
  return runAction(async (): Promise<ActionResult<{ id: string }>> => {
    const ctx = await getContext();
    const data = recordInput.parse({
      memberId: form.get("memberId"),
      type: form.get("type"),
      title: form.get("title"),
      recordDate: form.get("recordDate"),
      provider: form.get("provider") || undefined,
      notes: form.get("notes") || undefined,
    });
    requireCan(ctx, "records.upload", data.memberId);
    if (data.recordDate > istDate()) return { ok: false, error: "The report date can't be in the future.", fieldErrors: { recordDate: "Can't be in the future" } };

    const file = form.get("file");
    let fileFields: { fileName: string; mimeType: string; sizeBytes: number; fileData: Buffer } | null = null;
    if (file instanceof File && file.size > 0) {
      if (file.size > MAX_UPLOAD_BYTES) return { ok: false, error: "That file is larger than 8 MB. Try a smaller photo or PDF.", fieldErrors: { file: "Max 8 MB" } };
      const bytes = Buffer.from(await file.arrayBuffer());
      const mimeType = detectFileType(bytes);
      if (!mimeType) return { ok: false, error: "Please upload a PDF, JPG, PNG or WebP file.", fieldErrors: { file: "PDF, JPG, PNG or WebP only" } };
      fileFields = { fileName: file.name.slice(0, 120), mimeType, sizeBytes: bytes.length, fileData: encrypt(bytes) };
    }

    const [row] = await db
      .insert(records)
      .values({ ...data, provider: data.provider ?? null, notes: data.notes ?? null, ...(fileFields ?? {}), createdBy: ctx.user.id })
      .returning({ id: records.id });
    const member = ctx.members.find((m) => m.id === data.memberId)!;
    await audit(ctx.family.id, ctx.user.id, "record.uploaded", { member: member.name, title: data.title, encrypted: Boolean(fileFields) });
    revalidatePath("/", "layout");
    return { ok: true, message: `Saved "${data.title}" for ${member.name.split(" ")[0]}${fileFields ? " · encrypted" : ""}`, data: { id: row.id } };
  });
}

export async function deleteRecord(id: string): Promise<ActionResult> {
  return runAction(async () => {
    const ctx = await getContext();
    const [rec] = await db.select({ id: records.id, memberId: records.memberId, title: records.title }).from(records).where(eq(records.id, id)).limit(1);
    if (!rec) throw new ForbiddenError("That record was already deleted.");
    requireCan(ctx, "records.upload", rec.memberId);
    await db.delete(records).where(eq(records.id, id));
    await audit(ctx.family.id, ctx.user.id, "record.deleted", { title: rec.title });
    revalidatePath("/", "layout");
    return { ok: true, message: `Deleted "${rec.title}"` };
  });
}
