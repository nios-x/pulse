"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { medications, records } from "@/db/schema";
import { runAction, type ActionResult } from "@/lib/action";
import { aiEnabled, geminiJson } from "@/lib/ai";
import { audit } from "@/lib/audit";
import { encrypt } from "@/lib/crypto";
import { getContext, requireCan } from "@/lib/context";
import { addDays, istDate } from "@/lib/dates";
import { checkInteractions } from "@/lib/drugs";
import { detectFileType, MAX_UPLOAD_BYTES } from "@/lib/files";
import { firstName } from "@/lib/labels";
import { PRESCRIPTION_PROMPT, prescriptionSchema, SAMPLE_SCAN, toReviewed, type ReviewedMedicine } from "@/lib/prescription";

export type ScanResult = {
  source: "ai" | "sample";
  doctor: string | null;
  date: string | null;
  notes: string | null;
  medicines: ReviewedMedicine[];
  warnings: string[];
};

async function readImage(form: FormData) {
  const file = form.get("file");
  if (!(file instanceof File) || file.size === 0) return { error: "Choose a photo of the prescription first." } as const;
  if (file.size > MAX_UPLOAD_BYTES) return { error: "That photo is larger than 8 MB. Try a smaller one." } as const;
  const bytes = Buffer.from(await file.arrayBuffer());
  const mimeType = detectFileType(bytes);
  if (!mimeType) return { error: "Please use a JPG, PNG, WebP photo or a PDF." } as const;
  return { bytes, mimeType, name: file.name } as const;
}

/** Reads a prescription photo with AI and returns medicines for the family to review. Nothing is saved yet. */
export async function scanPrescription(form: FormData): Promise<ActionResult<ScanResult>> {
  return runAction(async (): Promise<ActionResult<ScanResult>> => {
    const ctx = await getContext();
    const memberId = z.string().uuid().parse(form.get("memberId"));
    requireCan(ctx, "records.upload", memberId);
    const img = await readImage(form);
    if ("error" in img) return { ok: false, error: img.error! };

    let scan = SAMPLE_SCAN;
    let source: ScanResult["source"] = "sample";
    if (aiEnabled()) {
      const res = await geminiJson([{ text: PRESCRIPTION_PROMPT }, { image: { base64: img.bytes!.toString("base64"), mimeType: img.mimeType! } }], prescriptionSchema, { temperature: 0 });
      if (!res.ok) {
        return { ok: false, error: res.reason === "busy" ? "The AI service is busy. Please try again in a minute." : "We couldn't read that prescription. Try a clearer, well-lit photo, or add the medicines by hand." };
      }
      if (!res.data.legible || res.data.medicines.length === 0) {
        return { ok: false, error: "This doesn't look like a readable prescription. Try a clearer photo, flat and in good light." };
      }
      scan = res.data;
      source = "ai";
    }
    const medicines = toReviewed(scan);
    const current = await db.select().from(medications).where(eq(medications.memberId, memberId));
    const { interactions, duplicates } = checkInteractions([
      ...current.filter((m) => m.active).map((m) => ({ id: m.id, name: m.name, genericName: m.genericName })),
      ...medicines.map((m, i) => ({ id: `scan-${i}`, name: m.name, genericName: m.genericName })),
    ]);
    const warnings = [
      ...interactions.filter((i) => i.first.id.startsWith("scan") || i.second.id.startsWith("scan")).map((i) => `${i.first.name} + ${i.second.name}: ${i.effect}`),
      ...duplicates.filter((d) => d.medicines.some((m) => m.id.startsWith("scan"))).map((d) => `${d.medicines.map((m) => m.name).join(" and ")} contain the same medicine.`),
    ];
    return { ok: true, data: { source, doctor: scan.doctor, date: scan.date, notes: scan.notes, medicines, warnings } };
  });
}

const confirmInput = z.object({
  memberId: z.string().uuid(),
  doctor: z.string().max(120).nullable(),
  items: z
    .array(
      z.object({
        name: z.string().trim().min(1).max(80),
        strength: z.string().max(40),
        genericName: z.string().max(80).nullable(),
        times: z.array(z.string().regex(/^\d{2}:\d{2}$/)).min(1, "Each medicine needs at least one time").max(6),
        instructions: z.string().max(120).nullable(),
        durationDays: z.number().int().min(0).max(365).nullable(),
      })
    )
    .max(15),
  saveRecord: z.boolean(),
});

/** Adds the reviewed medicines and (optionally) saves the photo as an encrypted prescription record. */
export async function confirmScan(form: FormData): Promise<ActionResult<{ added: number }>> {
  return runAction(async (): Promise<ActionResult<{ added: number }>> => {
    const ctx = await getContext();
    const data = confirmInput.parse(JSON.parse(String(form.get("payload") ?? "{}")));
    if (data.items.length) requireCan(ctx, "meds.manage", data.memberId);
    if (data.saveRecord) requireCan(ctx, "records.upload", data.memberId);
    const today = istDate();
    const member = ctx.members.find((m) => m.id === data.memberId)!;

    await db.transaction(async (tx) => {
      if (data.items.length) {
        await tx.insert(medications).values(
          data.items.map((m) => ({
            memberId: data.memberId,
            name: m.name,
            genericName: m.genericName,
            strength: m.strength,
            instructions: m.instructions,
            times: m.times,
            startDate: today,
            endDate: m.durationDays ? addDays(today, m.durationDays - 1) : null,
            prescribedBy: data.doctor,
            createdBy: ctx.user.id,
          }))
        );
      }
      if (data.saveRecord) {
        const img = await readImage(form);
        if (!("error" in img)) {
          await tx.insert(records).values({
            memberId: data.memberId,
            type: "prescription",
            title: data.doctor ? `Prescription from ${data.doctor}` : "Prescription",
            recordDate: today,
            provider: data.doctor,
            fileName: img.name!.slice(0, 120),
            mimeType: img.mimeType!,
            sizeBytes: img.bytes!.length,
            fileData: encrypt(img.bytes!),
            extracted: { highlights: data.items.map((m) => `${m.name} ${m.strength}`.trim()), source: "scan" },
            createdBy: ctx.user.id,
          });
        }
      }
    });
    await audit(ctx.family.id, ctx.user.id, "prescription.scanned", { member: member.name, medicines: data.items.length, savedRecord: data.saveRecord });
    revalidatePath("/", "layout");
    return {
      ok: true,
      message: `${data.items.length} medicine${data.items.length === 1 ? "" : "s"} added for ${firstName(member.name)}${data.saveRecord ? " and the prescription saved to records" : ""}`,
      data: { added: data.items.length },
    };
  });
}
