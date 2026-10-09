import type { Condition, PcosPhenotype, PlanItem } from "@/db/schema";

/**
 * Personalized, rule-based lifestyle recommendations. They are everyday habits from
 * widely accepted guidance (salt, walking, sleep, water), never medicine changes.
 * Each item maps to something Pulse can track, so progress can be shown.
 */

export type RecInput = {
  age: number | null;
  sex: string | null;
  conditions: Condition[];
  latest: { bpSys?: number; bpDia?: number; sugarFasting?: number; bmi?: number | null };
  pcos?: PcosPhenotype | null;
  hasMeds: boolean;
};

const has = (conds: Condition[], ...words: string[]) => conds.some((c) => words.some((w) => c.name.toLowerCase().includes(w)));

export function recommend(input: RecInput): PlanItem[] {
  const items: PlanItem[] = [];
  const add = (i: PlanItem) => {
    if (!items.some((x) => x.key === i.key)) items.push(i);
  };
  const c = input.conditions;
  const bpHigh = (input.latest.bpSys ?? 0) >= 130 || (input.latest.bpDia ?? 0) >= 85 || has(c, "blood pressure", "hypertension");
  const sugarHigh = (input.latest.sugarFasting ?? 0) >= 110 || has(c, "diabetes", "sugar");

  if (input.hasMeds) add({ key: "meds_on_time", title: "Take medicines on time", detail: "Tick each dose in Pulse. Your family is told if one is missed.", category: "meds" });
  if (bpHigh) {
    add({ key: "low_salt", title: "Less salt, every meal", detail: "Under one teaspoon a day. Skip papad, pickle and namkeen on most days.", category: "eat", habit: "produce" });
    add({ key: "bp_morning", title: "Check BP each morning", detail: "Sit quietly for 5 minutes first. Same arm, same time.", category: "track" });
  }
  if (sugarHigh) {
    add({ key: "post_meal_walk", title: "10-minute walk after meals", detail: "A short walk after lunch and dinner helps keep sugar steadier.", category: "move", habit: "walk" });
    add({ key: "smart_carbs", title: "Swap white rice twice a week", detail: "Try millets (jowar, bajra, ragi) or brown rice, with dal or sabzi first.", category: "eat", habit: "produce" });
    add({ key: "fasting_check", title: "Fasting sugar 3 times a week", detail: "Before tea or breakfast. Pulse charts the trend for your doctor.", category: "track" });
  }
  if (has(c, "thyroid")) add({ key: "thyroid_timing", title: "Thyroid tablet on an empty stomach", detail: "Water only, 30–60 minutes before tea or breakfast. Calcium and iron 4 hours later.", category: "meds" });
  if (has(c, "asthma")) add({ key: "asthma_triggers", title: "Keep the inhaler close", detail: "Avoid smoke and dust on high-pollution days. Note any night coughing.", category: "track" });
  if (has(c, "arthritis", "osteoarthritis", "knee")) add({ key: "joint_move", title: "Gentle joint exercises daily", detail: "15 minutes of knee-friendly movement: straight-leg raises, cycling, or a slow walk.", category: "move", habit: "walk" });
  if (has(c, "acidity", "gerd")) add({ key: "light_dinner", title: "Early, light dinner", detail: "Finish dinner 2–3 hours before bed. Less fried and spicy food at night.", category: "eat" });
  if (input.pcos) {
    add({ key: "protein_breakfast", title: "Protein-first breakfast", detail: "Eggs, paneer, sprouts or dal chilla before anything sweet or starchy.", category: "eat", habit: "produce" });
    add({ key: "strength", title: "Strength training 3 times a week", detail: "20 minutes of squats, wall push-ups or resistance bands.", category: "move", habit: "walk" });
    if (input.pcos === "adrenal_stress") add({ key: "breathing", title: "5 minutes of slow breathing", detail: "Box breathing (4-4-4-4) once a day, especially before bed.", category: "mind", habit: "mindful" });
  }
  if ((input.latest.bmi ?? 0) >= 25 && !items.some((i) => i.category === "move")) add({ key: "daily_walk", title: "Walk 30 minutes a day", detail: "Brisk enough to talk but not sing. Split it into 3 short walks if easier.", category: "move", habit: "walk" });

  // Everyone
  add({ key: "water", title: "8 glasses of water", detail: "Keep a bottle in sight. More in summer.", category: "eat", habit: "water" });
  add({ key: "sleep", title: "Sleep 7–8 hours", detail: "Same bedtime each night. Screens off 30 minutes before.", category: "sleep", habit: "sleep" });
  if (!items.some((i) => i.category === "move")) add({ key: "daily_walk", title: "Walk 30 minutes a day", detail: "A brisk walk or play outside counts.", category: "move", habit: "walk" });
  if (input.age != null && input.age < 13) {
    return items.filter((i) => i.key !== "fasting_check").map((i) => (i.key === "daily_walk" ? { ...i, title: "An hour of active play", detail: "Cycling, running, sports: anything that gets them moving." } : i)).slice(0, 5);
  }
  return items.slice(0, 6);
}
