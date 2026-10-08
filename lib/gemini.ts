import "server-only";
import { GoogleGenAI } from "@google/genai";
import { z } from "zod";
import { buildFoodPrompt } from "@/lib/food-photo";
import { foodDetectionSchema } from "@/lib/validators";

const MODEL = process.env.GEMINI_MODEL ?? "gemini-3.8-flash";

/** Meal photos are offered only when a Gemini API key is configured. */
export function foodPhotoEnabled(): boolean {
  return Boolean(process.env.GEMINI_API_KEY);
}

let client: GoogleGenAI | null = null;
function gemini(): GoogleGenAI {
  client ??= new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY,
    // Only set in tests, to point at a local stand-in for the Gemini API.
    ...(process.env.GEMINI_BASE_URL ? { httpOptions: { baseUrl: process.env.GEMINI_BASE_URL } } : {}),
  });
  return client;
}

const responseSchema = z.toJSONSchema(foodDetectionSchema);

/**
 * Sends one meal photo (inline base64) to Gemini and returns the foods it
 * sees, validated. Returns null if the call fails or the answer doesn't fit
 * the schema. The photo itself is not stored anywhere.
 */
export async function detectFoods(base64: string, mimeType: string) {
  try {
    const interaction = await gemini().interactions.create(
      {
        model: MODEL,
        input: [
          { type: "text", text: buildFoodPrompt() },
          { type: "image", data: base64, mime_type: mimeType, resolution: "medium" },
        ],
        response_format: { type: "text", mime_type: "application/json", schema: responseSchema },
        generation_config: { thinking_level: "low", temperature: 0 }, // this model rejects "minimal"
      },
      { timeout_ms: 25_000 }
    );
    const parsed = foodDetectionSchema.safeParse(JSON.parse(interaction.output_text ?? ""));
    return parsed.success ? parsed.data : null;
  } catch (err) {
    console.error("food photo analysis failed", err instanceof Error ? err.message : err);
    return null;
  }
}
