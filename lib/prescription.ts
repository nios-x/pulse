import { z } from "zod";
import { GENERIC_LABEL, lookupGenerics } from "@/lib/drugs";

/** What we ask the AI to return from a prescription photo. */
export const prescriptionSchema = z.object({
  doctor: z.string().max(120).nullable(),
  date: z.string().max(20).nullable().describe("Date on the prescription as YYYY-MM-DD if readable"),
  medicines: z
    .array(
      z.object({
        name: z.string().min(1).max(80).describe("Medicine name exactly as written, without Tab./Cap. prefix"),
        strength: z.string().max(40).nullable().describe("e.g. 500 mg"),
        frequency: z.string().max(20).nullable().describe("Dosing pattern like 1-0-1, 1-1-1, 0-0-1, OD, BD, TDS, SOS"),
        timing: z.string().max(60).nullable().describe("e.g. after food, before breakfast, at bedtime"),
        durationDays: z.number().int().min(0).max(365).nullable(),
        confidence: z.enum(["high", "medium", "low"]),
      })
    )
    .max(15),
  notes: z.string().max(400).nullable().describe("Advice or tests written on the prescription"),
  legible: z.boolean().describe("False if the image is not a readable prescription"),
});

export type PrescriptionScan = z.infer<typeof prescriptionSchema>;

export const PRESCRIPTION_PROMPT = `You read Indian doctor prescriptions (printed or handwritten) and extract the medicines.
Rules:
- Only extract what is written. Never add, guess or recommend medicines.
- If a word is unclear, keep your best reading and set confidence to "low".
- Frequency: keep the doctor's pattern (e.g. "1-0-1" = morning and night, "OD" = once daily, "BD" = twice, "TDS" = thrice, "HS" = at bedtime, "SOS" = only when needed).
- If the image is not a prescription or cannot be read, set legible=false and return an empty medicines list.`;

/** Converts a dosing pattern to clock times in India time. SOS → no fixed time. */
export function frequencyToTimes(frequency: string | null | undefined, timing?: string | null): string[] {
  const f = (frequency ?? "").trim().toUpperCase().replace(/\s+/g, "");
  const t = (timing ?? "").toLowerCase();
  const pattern = f.match(/^([0-9½.]+)-([0-9½.]+)-([0-9½.]+)$/);
  if (pattern) {
    const [, m, a, n] = pattern;
    const times: string[] = [];
    if (m !== "0") times.push("08:00");
    if (a !== "0") times.push("14:00");
    if (n !== "0") times.push(t.includes("bed") ? "21:30" : "20:00");
    return times;
  }
  if (["OD", "QD", "1", "ONCE", "DAILY"].includes(f)) return [t.includes("night") || t.includes("bed") ? "21:00" : "08:00"];
  if (["HS", "QHS"].includes(f)) return ["21:30"];
  if (["BD", "BID", "2", "TWICE"].includes(f)) return ["08:00", "20:00"];
  if (["TDS", "TID", "3", "THRICE"].includes(f)) return ["08:00", "14:00", "20:00"];
  if (["QID", "4"].includes(f)) return ["07:00", "12:00", "17:00", "22:00"];
  return [];
}

export function describeTimes(times: string[]): string {
  if (!times.length) return "Only when needed";
  return times.map((t) => (t < "12:00" ? "Morning" : t < "17:00" ? "Afternoon" : "Night")).join(", ");
}

export type ReviewedMedicine = {
  name: string;
  strength: string;
  genericName: string | null;
  times: string[];
  instructions: string | null;
  durationDays: number | null;
  confidence: "high" | "medium" | "low";
  known: boolean;
};

export function toReviewed(scan: PrescriptionScan): ReviewedMedicine[] {
  return scan.medicines.map((m) => {
    const name = m.name.replace(/^(tab|cap|syp|syr|inj)\.?\s*/i, "").trim();
    const generics = lookupGenerics(name);
    return {
      name,
      strength: m.strength ?? "",
      genericName: generics.length ? generics.map((g) => GENERIC_LABEL[g]).join(" + ") : null,
      times: frequencyToTimes(m.frequency, m.timing),
      instructions: m.timing,
      durationDays: m.durationDays,
      confidence: m.confidence,
      known: generics.length > 0,
    };
  });
}

/** Shown only when no AI key is configured, and always labelled as a sample. */
export const SAMPLE_SCAN: PrescriptionScan = {
  doctor: "Dr. Anjali Deshpande (sample)",
  date: null,
  medicines: [
    { name: "Tab. Dolo", strength: "650 mg", frequency: "1-1-1", timing: "after food", durationDays: 3, confidence: "high" },
    { name: "Tab. Pan", strength: "40 mg", frequency: "1-0-0", timing: "before breakfast", durationDays: 5, confidence: "high" },
    { name: "Tab. Cetzine", strength: "10 mg", frequency: "0-0-1", timing: "at bedtime", durationDays: 5, confidence: "medium" },
  ],
  notes: "Plenty of fluids. Review if fever lasts beyond 3 days.",
  legible: true,
};
