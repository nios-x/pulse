import { describe, expect, it } from "vitest";
import { FOOD_KEYS } from "@/lib/foods";
import { buildFoodPrompt, describeDetected, keysFromDetection, type DetectedFood } from "./food-photo";
import { foodDetectionSchema, mealSchema } from "./validators";

const rajma: DetectedFood = { key: "dal", name_en: "Rajma", name_hi: "राजमा", portion: "1 bowl", carb: "medium" };
const rice: DetectedFood = { key: "rice", name_en: "Jeera rice", name_hi: "जीरा राइस", portion: "1 plate", carb: "high" };
const pickle: DetectedFood = { key: "other", name_en: "Pickle", name_hi: "अचार", portion: "1 spoon", carb: "low" };

describe("keysFromDetection", () => {
  it("ticks each matched food once, in order, and skips 'other'", () => {
    expect(keysFromDetection([rajma, rice, pickle, { ...rice, name_en: "Rice" }])).toEqual(["dal", "rice"]);
  });
});

describe("describeDetected", () => {
  it("names the dish with its portion in the reader's language", () => {
    expect(describeDetected(rajma, "en")).toBe("Rajma (1 bowl)");
    expect(describeDetected(rajma, "hi")).toBe("राजमा (1 bowl)");
  });
});

describe("prompt", () => {
  const prompt = buildFoodPrompt();
  it("lists every food key so the answer maps onto the app's food list", () => {
    for (const key of FOOD_KEYS) expect(prompt).toContain(`- ${key}:`);
  });
  it("tells the model not to give advice", () => {
    expect(prompt).toMatch(/Do not give any health, diet or medical advice/);
  });
});

describe("foodDetectionSchema (the AI's answer)", () => {
  it("accepts a well-formed answer and drops anything extra, such as advice", () => {
    const parsed = foodDetectionSchema.parse({ is_food: true, items: [rajma], advice: "Eat less rice" });
    expect(parsed).toEqual({ is_food: true, items: [rajma] });
  });
  it("rejects keys outside the food list", () => {
    expect(foodDetectionSchema.safeParse({ is_food: true, items: [{ ...rajma, key: "pizza" }] }).success).toBe(false);
  });
});

describe("mealSchema with a photo", () => {
  const base = { patientId: "0b4c3c5e-8d7a-4d1e-9f53-2f6f1a2b3c4d", slot: "dinner" };
  it("saves a photo meal even when every dish is 'other'", () => {
    expect(mealSchema.safeParse({ ...base, items: [], details: [pickle] }).success).toBe(true);
  });
  it("still needs at least one food", () => {
    expect(mealSchema.safeParse({ ...base, items: [] }).success).toBe(false);
  });
});
