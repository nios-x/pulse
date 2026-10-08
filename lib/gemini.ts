import "server-only";
import { GoogleGenAI } from "@google/genai";
import { z } from "zod";
import { buildFoodPrompt } from "@/lib/food-photo";
import { foodDetectionSchema } from "@/lib/validators";

const MODEL = process.env.GEMINI_MODEL ?? "gemini-3.8-flash";
/** The whole call, retries included. People are waiting with the phone in hand. */
const TOTAL_TIMEOUT_MS = 30_000;

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

export type FoodDetection = z.infer<typeof foodDetectionSchema>;

/**
 * Sends one meal photo (inline base64) to Gemini and returns the foods it
 * sees, validated against foodDetectionSchema. "busy" when Google is
 * overloaded or rate-limiting (429/503), null for any other failure.
 * The photo itself is not stored anywhere.
 */
export async function detectFoods(base64: string, mimeType: string): Promise<FoodDetection | "busy" | null> {
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
      {
        retries: { strategy: "attempt-count-backoff", maxRetries: 1, backoff: { initialInterval: 1000, maxInterval: 2000 } },
        fetchOptions: { signal: AbortSignal.timeout(TOTAL_TIMEOUT_MS) },
      }
    );
    const parsed = foodDetectionSchema.safeParse(JSON.parse(interaction.output_text ?? ""));
    return parsed.success ? parsed.data : null;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("food photo analysis failed", message.slice(0, 200));
    return /^(429|503)\b|high demand|RESOURCE_EXHAUSTED|UNAVAILABLE/.test(message) ? "busy" : null;
  }
}

// ---------- Pulse Assistant ----------

/** The assistant is offered only when a Gemini API key is configured. */
export const assistantEnabled = foodPhotoEnabled;

/**
 * One assistant reply for the conversation so far. `store: false`, so Google
 * keeps neither the question nor the health data in the prompt.
 * "busy" when Google is overloaded or rate-limiting, null for any other failure.
 */
export async function askAssistant(
  systemPrompt: string,
  turns: readonly { role: "user" | "assistant"; text: string }[]
): Promise<string | "busy" | null> {
  try {
    const interaction = await gemini().interactions.create(
      {
        model: MODEL,
        system_instruction: systemPrompt,
        input: turns.map((t) => ({
          type: t.role === "user" ? ("user_input" as const) : ("model_output" as const),
          content: [{ type: "text" as const, text: t.text }],
        })),
        store: false,
        generation_config: { thinking_level: "low", temperature: 0.3 },
      },
      {
        retries: { strategy: "attempt-count-backoff", maxRetries: 1, backoff: { initialInterval: 1000, maxInterval: 2000 } },
        fetchOptions: { signal: AbortSignal.timeout(TOTAL_TIMEOUT_MS) },
      }
    );
    const text = interaction.output_text?.trim();
    return text ? text.slice(0, 2000) : null;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("assistant reply failed", message.slice(0, 200));
    return /^(429|503)\b|high demand|RESOURCE_EXHAUSTED|UNAVAILABLE/.test(message) ? "busy" : null;
  }
}
