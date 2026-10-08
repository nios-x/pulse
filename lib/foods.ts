// Everyday foods for one-tap meal chips. A constant list, not a table.
// The carb tag drives the meal-effect insight (lib/insights.ts).

export type CarbTag = "high" | "medium" | "low";
export type Food = { key: string; en: string; hi: string; carb: CarbTag };

export const FOODS = [
  { key: "roti", en: "Roti", hi: "रोटी", carb: "medium" },
  { key: "rice", en: "Rice", hi: "चावल", carb: "high" },
  { key: "paratha", en: "Paratha", hi: "पराठा", carb: "high" },
  { key: "dal", en: "Dal", hi: "दाल", carb: "low" },
  { key: "sabzi", en: "Sabzi", hi: "सब्ज़ी", carb: "low" },
  { key: "poha", en: "Poha", hi: "पोहा", carb: "high" },
  { key: "curd", en: "Curd", hi: "दही", carb: "low" },
  { key: "egg_meat", en: "Egg or meat", hi: "अंडा या मांस", carb: "low" },
  { key: "fruit", en: "Fruit", hi: "फल", carb: "medium" },
  { key: "sweets", en: "Sweets", hi: "मिठाई", carb: "high" },
  { key: "chai_sugar", en: "Chai with sugar", hi: "चीनी वाली चाय", carb: "high" },
  { key: "fried_snack", en: "Fried snack", hi: "तला हुआ नाश्ता", carb: "high" },
] as const satisfies readonly Food[];

export type FoodKey = (typeof FOODS)[number]["key"];

export const FOOD_KEYS = FOODS.map((f) => f.key) as [FoodKey, ...FoodKey[]];

const byKey = new Map<string, Food>(FOODS.map((f) => [f.key, f]));

export function getFood(key: string): Food | undefined {
  return byKey.get(key);
}

export function foodLabel(key: string, locale: "en" | "hi"): string {
  const food = byKey.get(key);
  return food ? food[locale] : key;
}

export function isHighCarb(key: string): boolean {
  return byKey.get(key)?.carb === "high";
}

export type MealSlotKey = "breakfast" | "lunch" | "dinner" | "snack";

/** The meal slot a log most likely belongs to, from India clock minutes since midnight. */
export function slotForTime(minutes: number): MealSlotKey {
  if (minutes >= 4 * 60 && minutes < 11 * 60) return "breakfast";
  if (minutes >= 11 * 60 && minutes < 15 * 60 + 30) return "lunch";
  if (minutes >= 15 * 60 + 30 && minutes < 18 * 60 + 30) return "snack";
  return "dinner";
}
