import "server-only";
import { GoogleGenAI } from "@google/genai";
import { z } from "zod";

/**
 * Gemini, used for two things only: reading prescriptions and phrasing triage advice.
 * Every call returns JSON validated against a zod schema; anything else is discarded.
 * Without GEMINI_API_KEY the features fall back to clearly labelled non-AI behaviour.
 */
const MODEL = process.env.GEMINI_MODEL ?? "gemini-3.8-flash";
const TIMEOUT_MS = 30_000;

export function aiEnabled(): boolean {
  return Boolean(process.env.GEMINI_API_KEY);
}

let client: GoogleGenAI | null = null;
function gemini(): GoogleGenAI {
  client ??= new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY,
    ...(process.env.GEMINI_BASE_URL ? { httpOptions: { baseUrl: process.env.GEMINI_BASE_URL } } : {}),
  });
  return client;
}

export type AiPart = { text: string } | { image: { base64: string; mimeType: string } };

export async function geminiJson<T extends z.ZodType>(
  parts: AiPart[],
  schema: T,
  opts: { system?: string; temperature?: number } = {}
): Promise<{ ok: true; data: z.infer<T> } | { ok: false; reason: "disabled" | "busy" | "invalid" | "error" }> {
  if (!aiEnabled()) return { ok: false, reason: "disabled" };
  try {
    const res = await gemini().models.generateContent({
      model: MODEL,
      contents: [
        {
          role: "user",
          parts: parts.map((p) => ("text" in p ? { text: p.text } : { inlineData: { data: p.image.base64, mimeType: p.image.mimeType } })),
        },
      ],
      config: {
        systemInstruction: opts.system,
        temperature: opts.temperature ?? 0.2,
        responseMimeType: "application/json",
        responseJsonSchema: z.toJSONSchema(schema),
        abortSignal: AbortSignal.timeout(TIMEOUT_MS),
      },
    });
    const parsed = schema.safeParse(JSON.parse(res.text ?? ""));
    return parsed.success ? { ok: true, data: parsed.data } : { ok: false, reason: "invalid" };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[ai] call failed:", message.slice(0, 300));
    return { ok: false, reason: /429|503|RESOURCE_EXHAUSTED|UNAVAILABLE|overloaded/i.test(message) ? "busy" : "error" };
  }
}
