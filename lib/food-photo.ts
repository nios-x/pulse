// Meal photos: the prompt we send to Gemini and how its answer becomes a meal.
// The model only names foods and portions. It never gives advice, and its
// answer is checked against foodDetectionSchema before anything is shown.

import { FOODS, type FoodKey } from "@/lib/foods";
import type { z } from "zod";
import type { detectedFoodSchema } from "@/lib/validators";

export type DetectedFood = z.infer<typeof detectedFoodSchema>;

// What each key covers, so regional dishes land on the right carb group.
const KEY_HINTS: Record<FoodKey, string> = {
  roti: "roti, chapati, phulka, fulka, naan, kulcha, bhakri, thepla without much oil",
  rice: "any rice: plain rice, jeera rice, pulao, biryani, khichdi, curd rice, fried rice, idli, dosa",
  paratha: "paratha, puri, bhatura, stuffed or oily flatbreads",
  dal: "dal, sambar, rajma, chole, kadhi, any lentil or bean curry",
  sabzi: "vegetable dishes, salad, raita with vegetables, paneer sabzi",
  poha: "poha, upma, vermicelli, sabudana, flattened-rice or semolina dishes",
  curd: "curd, dahi, plain raita, buttermilk, lassi without sugar",
  egg_meat: "egg, chicken, mutton, fish, any meat curry",
  fruit: "any fresh fruit",
  sweets: "sweets, mithai, halwa, kheer, dessert, sugary drinks",
  chai_sugar: "tea or coffee with sugar",
  fried_snack: "samosa, pakora, kachori, namkeen, chips, other fried snacks",
};

export function buildFoodPrompt(): string {
  const keys = FOODS.map((f) => `- ${f.key}: ${KEY_HINTS[f.key]}`).join("\n");
  return [
    "You look at a photo taken in an Indian home to log a meal for a diabetes app.",
    "List each distinct food or drink you can see. Do not give any health, diet or medical advice.",
    "For every item:",
    "- key: the closest key from this list, or \"other\" if nothing fits:",
    keys,
    "- name_en: the dish name in English (e.g. \"Rajma\", \"Jeera rice\").",
    "- name_hi: the dish name in Hindi, in Devanagari script.",
    "- portion: a short visible amount (e.g. \"2 rotis\", \"1 bowl\", \"1 plate\").",
    "- carb: high, medium or low carbohydrate for a typical serving.",
    "If the photo shows no food or drink, set is_food to false and items to [].",
  ].join("\n");
}

/** The food keys to tick, in the order seen, without duplicates or "other". */
export function keysFromDetection(items: readonly DetectedFood[]): FoodKey[] {
  const keys: FoodKey[] = [];
  for (const item of items) {
    if (item.key !== "other" && !keys.includes(item.key)) keys.push(item.key);
  }
  return keys;
}

/** "Rajma (1 bowl)" in the reader's language. */
export function describeDetected(item: DetectedFood, locale: "en" | "hi"): string {
  const name = locale === "hi" ? item.name_hi : item.name_en;
  return item.portion ? `${name} (${item.portion})` : name;
}
