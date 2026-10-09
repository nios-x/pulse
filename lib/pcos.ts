import type { PcosPhenotype, PcosPrescribed } from "@/db/schema";
import { addDays } from "@/lib/dates";

/**
 * PCOS care companion (rebuilt from the team's original module).
 * Works with the doctor's prescription, never instead of it: the daily protocol is
 * lifestyle only, and every interpretation carries the "not a diagnosis" note.
 */

export type OnboardingAnswers = {
  diagnosedWhen: "recent" | "1_3_years" | "3_plus_years" | "suspected";
  wasBirthControl: boolean;
  weightDistribution: "midsection" | "even" | "lean" | "prefer_not";
  concerns: string[];
  stressLevel: "managing" | "constant" | "panic_anxiety";
  sleepPattern: "before_midnight" | "midnight_2am" | "after_2am" | "chaotic";
  eatingPattern: "regular_3meals" | "skip_breakfast" | "eat_when_remember" | "restrict_binge";
  topPriority: "periods" | "skin" | "energy" | "weight" | "fertility" | "all";
};

export const PHENOTYPE_INFO: Record<PcosPhenotype, { title: string; summary: string }> = {
  insulin_resistant: { title: "Insulin-led", summary: "The most common pattern. Steady blood sugar through protein-first meals and movement after eating tends to help most." },
  adrenal_stress: { title: "Stress-led", summary: "Stress hormones play a bigger part. Calm mornings, gentle movement and regular sleep come first." },
  inflammatory: { title: "Inflammation-led", summary: "Bloating, fatigue and skin flare-ups are common. Gut-friendly and anti-inflammatory foods help." },
  post_pill: { title: "Post-pill", summary: "Symptoms began after stopping birth control. Give the body time; support with steady routines." },
};

/** Ported from the original classifier: the doctor's prescription always wins. */
export function classifyPhenotype(answers: OnboardingAnswers, prescribed: PcosPrescribed[]): PcosPhenotype {
  const meds = prescribed.map((m) => m.name.toLowerCase());
  if (meds.some((m) => m.includes("metformin") || m.includes("glycomet") || m.includes("berberine"))) return "insulin_resistant";
  if (meds.some((m) => m.includes("spironolactone") || m.includes("aldactone"))) return "adrenal_stress";
  if (answers.wasBirthControl) return "post_pill";
  if (answers.stressLevel !== "managing" && answers.weightDistribution === "lean" && (answers.sleepPattern === "after_2am" || answers.sleepPattern === "chaotic")) return "adrenal_stress";
  if (answers.weightDistribution === "midsection") return "insulin_resistant";
  if (answers.concerns.includes("bloating") || answers.topPriority === "energy") return "inflammatory";
  return "insulin_resistant";
}

export type ProtocolAction = { key: string; block: "morning" | "midday" | "evening" | "anytime"; title: string; detail: string };

export function dailyProtocol(phenotype: PcosPhenotype): ProtocolAction[] {
  const base: ProtocolAction[] = [
    { key: "balanced_breakfast", block: "morning", title: "Protein breakfast", detail: "Eggs, paneer, sprouts or dal chilla" },
    { key: "post_meal_walk", block: "midday", title: "10-minute walk after your biggest meal", detail: "Helps steady blood sugar" },
    { key: "sleep_by_midnight", block: "evening", title: "Lights out by midnight", detail: "Screens off 30 minutes before" },
  ];
  const extra: Record<PcosPhenotype, ProtocolAction[]> = {
    insulin_resistant: [
      { key: "protein_first", block: "anytime", title: "Protein and veg before carbs", detail: "Eat dal or sabzi first, roti or rice last" },
      { key: "pair_carbs", block: "anytime", title: "Never eat carbs alone", detail: "Add curd, nuts or paneer to fruit and snacks" },
    ],
    adrenal_stress: [
      { key: "no_phone_morning", block: "morning", title: "No phone for 20 minutes after waking", detail: "Sunlight and water first" },
      { key: "breathing_5min", block: "anytime", title: "5 minutes of box breathing", detail: "Breathe in 4, hold 4, out 4, hold 4" },
      { key: "gentle_movement", block: "anytime", title: "Gentle movement only today", detail: "Yoga or a walk, skip intense workouts" },
    ],
    inflammatory: [
      { key: "anti_inflam_food", block: "anytime", title: "Turmeric, ginger or omega-3 in a meal", detail: "Haldi doodh, adrak chai, walnuts or fish" },
      { key: "gut_health", block: "anytime", title: "A fermented food", detail: "Curd, buttermilk or idli batter" },
    ],
    post_pill: [
      { key: "lemon_water", block: "morning", title: "Warm lemon water in the morning", detail: "A gentle start to the day" },
      { key: "cruciferous", block: "anytime", title: "A cruciferous vegetable", detail: "Cabbage, cauliflower or broccoli" },
    ],
  };
  return [...base, ...extra[phenotype]];
}

export const PCOS_SYMPTOMS = [
  { key: "acne", label: "Acne" },
  { key: "hair_growth", label: "Extra hair growth" },
  { key: "hair_thinning", label: "Hair thinning" },
  { key: "bloating", label: "Bloating" },
  { key: "fatigue", label: "Tiredness" },
  { key: "cramps", label: "Cramps" },
  { key: "sugar_cravings", label: "Sugar cravings" },
  { key: "low_mood", label: "Low mood" },
  { key: "anxiety", label: "Anxiety" },
  { key: "headache", label: "Headache" },
] as const;

export type FoodTag = "protein" | "fiber" | "fermented" | "anti_inflammatory" | "high_carb" | "moderate_carb" | "low_carb" | "healthy_fat";

export const PCOS_FOODS: { key: string; label: string; tags: FoodTag[] }[] = [
  { key: "dal", label: "Dal", tags: ["protein", "fiber", "moderate_carb"] },
  { key: "curd", label: "Curd", tags: ["protein", "fermented"] },
  { key: "paneer", label: "Paneer", tags: ["protein", "healthy_fat", "low_carb"] },
  { key: "eggs", label: "Eggs", tags: ["protein", "healthy_fat", "low_carb"] },
  { key: "chicken_fish", label: "Chicken or fish", tags: ["protein", "low_carb", "anti_inflammatory"] },
  { key: "sprouts", label: "Sprouts", tags: ["protein", "fiber"] },
  { key: "sabzi", label: "Green sabzi", tags: ["fiber", "low_carb"] },
  { key: "salad", label: "Salad", tags: ["fiber", "low_carb"] },
  { key: "nuts", label: "Nuts and seeds", tags: ["healthy_fat", "protein"] },
  { key: "roti", label: "Roti", tags: ["moderate_carb", "fiber"] },
  { key: "millet", label: "Millet roti", tags: ["moderate_carb", "fiber"] },
  { key: "rice", label: "White rice", tags: ["high_carb"] },
  { key: "poha", label: "Poha or upma", tags: ["high_carb"] },
  { key: "fruit", label: "Fruit", tags: ["moderate_carb", "fiber"] },
  { key: "sweets", label: "Sweets or mithai", tags: ["high_carb"] },
  { key: "chai_sugar", label: "Chai with sugar", tags: ["high_carb"] },
  { key: "haldi_doodh", label: "Haldi doodh", tags: ["anti_inflammatory"] },
];

/** "Pair your carbs": a meal with carbs but no protein or fibre gets a gentle tip. */
export function mealFeedback(items: string[]): { balanced: boolean; tip: string } {
  const tags = new Set(items.flatMap((k) => PCOS_FOODS.find((f) => f.key === k)?.tags ?? []));
  const carbs = tags.has("high_carb") || tags.has("moderate_carb");
  const protein = tags.has("protein");
  const fiber = tags.has("fiber");
  if (!items.length) return { balanced: false, tip: "Pick what you ate." };
  if (carbs && !protein) return { balanced: false, tip: "Add some protein next time (dal, curd, paneer or eggs) so the carbs don't spike your sugar." };
  if (carbs && !fiber) return { balanced: true, tip: "Good protein. A bowl of sabzi or salad would make it even steadier." };
  return { balanced: true, tip: "Nicely balanced: protein and fibre with your carbs." };
}

export type CycleStats = { lengths: number[]; average: number | null; shortest: number | null; longest: number | null; regular: boolean | null; daysSinceLast: number | null };

/** Cycle lengths without 28-day assumptions or "late" alarms. */
export function cycleStats(startDates: string[], today: string): CycleStats {
  const sorted = [...new Set(startDates)].sort();
  const lengths: number[] = [];
  for (let i = 1; i < sorted.length; i++) {
    lengths.push(Math.round((new Date(`${sorted[i]}T00:00:00Z`).getTime() - new Date(`${sorted[i - 1]}T00:00:00Z`).getTime()) / 86_400_000));
  }
  const last = sorted.at(-1);
  const daysSinceLast = last ? Math.round((new Date(`${today}T00:00:00Z`).getTime() - new Date(`${last}T00:00:00Z`).getTime()) / 86_400_000) : null;
  if (!lengths.length) return { lengths, average: null, shortest: null, longest: null, regular: null, daysSinceLast };
  const average = Math.round(lengths.reduce((a, b) => a + b, 0) / lengths.length);
  const shortest = Math.min(...lengths);
  const longest = Math.max(...lengths);
  return { lengths, average, shortest, longest, regular: shortest >= 21 && longest <= 35 && longest - shortest <= 7, daysSinceLast };
}

/** Red flags that should prompt a doctor visit, shown gently. */
export function cycleFlags(stats: CycleStats): string[] {
  const flags: string[] = [];
  if (stats.daysSinceLast != null && stats.daysSinceLast > 90) flags.push("No period logged for over 3 months. Worth mentioning to your doctor.");
  if (stats.longest != null && stats.longest > 45) flags.push("Some cycles were longer than 45 days. Share this trend with your doctor.");
  if (stats.shortest != null && stats.shortest < 21) flags.push("Some cycles were shorter than 21 days. Share this trend with your doctor.");
  return flags;
}

export const GRACE_REASONS = [
  { key: "period", label: "On my period" },
  { key: "flare_up", label: "Flare-up day" },
  { key: "sick", label: "Feeling sick" },
  { key: "travel", label: "Travelling" },
  { key: "mental_health", label: "Need a rest day" },
] as const;

export function lastDays(today: string, n: number): string[] {
  return Array.from({ length: n }, (_, i) => addDays(today, i - n + 1));
}
