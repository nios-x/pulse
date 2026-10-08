// Everyday foods for one-tap meal chips. A constant list, not a table.
// The carb tag drives the meal-effect insight (lib/insights.ts).

export type CarbTag = "high" | "medium" | "low";
export type Food = { key: string; en: string; hi: string; carb: CarbTag; emoji: string };

export const FOODS = [
  { key: "roti", en: "Roti", hi: "रोटी", carb: "medium", emoji: "🫓" },
  { key: "rice", en: "Rice", hi: "चावल", carb: "high", emoji: "🍚" },
  { key: "paratha", en: "Paratha", hi: "पराठा", carb: "high", emoji: "🥙" },
  { key: "dal", en: "Dal", hi: "दाल", carb: "low", emoji: "🥣" },
  { key: "sabzi", en: "Sabzi", hi: "सब्ज़ी", carb: "low", emoji: "🥗" },
  { key: "poha", en: "Poha", hi: "पोहा", carb: "high", emoji: "🍛" },
  { key: "curd", en: "Curd", hi: "दही", carb: "low", emoji: "🥛" },
  { key: "egg_meat", en: "Egg or meat", hi: "अंडा या मांस", carb: "low", emoji: "🍳" },
  { key: "fruit", en: "Fruit", hi: "फल", carb: "medium", emoji: "🍎" },
  { key: "sweets", en: "Sweets", hi: "मिठाई", carb: "high", emoji: "🍬" },
  { key: "chai_sugar", en: "Chai with sugar", hi: "चीनी वाली चाय", carb: "high", emoji: "☕" },
  { key: "fried_snack", en: "Fried snack", hi: "तला हुआ नाश्ता", carb: "high", emoji: "🥟" },
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
