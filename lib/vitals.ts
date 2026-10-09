import type { VitalKind } from "@/db/schema";

/**
 * General adult reference ranges, used only to label readings in plain words.
 * They are not a diagnosis; every screen that shows a label also shows the
 * "Not a diagnosis. Consult a doctor." note.
 */

export type VitalStatus = "normal" | "watch" | "high" | "low";

export const VITAL_META: Record<
  VitalKind,
  { label: string; unit: string; short: string; decimals: number; band?: [number, number] }
> = {
  bp: { label: "Blood pressure", unit: "mmHg", short: "BP", decimals: 0, band: [90, 120] },
  sugar: { label: "Blood sugar", unit: "mg/dL", short: "Sugar", decimals: 0, band: [70, 140] },
  weight: { label: "Weight", unit: "kg", short: "Weight", decimals: 1 },
  pulse: { label: "Pulse", unit: "bpm", short: "Pulse", decimals: 0, band: [60, 100] },
  spo2: { label: "Oxygen (SpO₂)", unit: "%", short: "SpO₂", decimals: 0, band: [95, 100] },
  temperature: { label: "Temperature", unit: "°F", short: "Temp", decimals: 1, band: [97, 99] },
};

export const SUGAR_CONTEXT_LABEL: Record<string, string> = {
  fasting: "Fasting",
  after_meal: "After meal",
  random: "Random",
};

export type Reading = { kind: VitalKind; value: number; value2?: number | null; context?: string | null };

export type Classified = { status: VitalStatus; label: string };

const STATUS_WORD: Record<VitalStatus, string> = {
  normal: "Normal",
  watch: "Slightly high",
  high: "High",
  low: "Low",
};

export function classify(r: Reading): Classified {
  const status = classifyStatus(r);
  let label = STATUS_WORD[status];
  if (r.kind === "bp" && status === "watch") label = "Elevated";
  return { status, label };
}

function classifyStatus(r: Reading): VitalStatus {
  switch (r.kind) {
    case "bp": {
      const sys = r.value;
      const dia = r.value2 ?? 0;
      if (sys < 90 || dia < 60) return "low";
      if (sys >= 140 || dia >= 90) return "high";
      if (sys >= 120 || dia >= 80) return "watch";
      return "normal";
    }
    case "sugar": {
      const v = r.value;
      if (v < 70) return "low";
      if (r.context === "fasting") {
        if (v >= 126) return "high";
        if (v >= 100) return "watch";
        return "normal";
      }
      if (v >= 200) return "high";
      if (v >= 140) return "watch";
      return "normal";
    }
    case "pulse":
      if (r.value < 50) return "low";
      if (r.value > 110) return "high";
      if (r.value > 100) return "watch";
      return "normal";
    case "spo2":
      if (r.value < 92) return "low";
      if (r.value < 95) return "watch";
      return "normal";
    case "temperature":
      if (r.value >= 100.4) return "high";
      if (r.value >= 99.1) return "watch";
      if (r.value < 95) return "low";
      return "normal";
    case "weight":
      return "normal";
  }
}

/** "150/95" or "126" or "72.4" */
export function formatReading(r: Reading): string {
  const meta = VITAL_META[r.kind];
  if (r.kind === "bp") return `${Math.round(r.value)}/${Math.round(r.value2 ?? 0)}`;
  return r.value.toFixed(meta.decimals);
}

/** Readings that should raise a family alert (not every "watch"). */
export function isAlarming(r: Reading): boolean {
  const { status } = classify(r);
  if (r.kind === "weight") return false;
  return status === "high" || status === "low";
}

/** BMI from kg and cm, one decimal. */
export function bmi(weightKg: number | null | undefined, heightCm: number | null | undefined): number | null {
  if (!weightKg || !heightCm) return null;
  const m = heightCm / 100;
  return Math.round((weightKg / (m * m)) * 10) / 10;
}
