import "server-only";
import { GoogleGenAI } from "@google/genai";
import { z } from "zod";

/**
 * Gemini, used for two things only: reading prescriptions and phrasing triage advice.
 * Every call returns JSON validated against a zod schema; anything else is discarded.
 * Without GEMINI_API_KEY the features fall back to clearly labelled non-AI behaviour.
 */
const MODEL = process.env.GEMINI_MODEL ?? "gemini-3.8-flash";
// Free-tier quotas are per model, so when the primary is rate-limited or overloaded we try these in order.
const FALLBACK_MODELS = (process.env.GEMINI_FALLBACK_MODELS ?? "gemini-3.5-flash,gemini-3.5-flash-lite")
  .split(",")
  .map((m) => m.trim())
  .filter((m) => m && m !== MODEL);
const TIMEOUT_MS = 30_000;

const isBusy = (message: string) => /429|503|RESOURCE_EXHAUSTED|UNAVAILABLE|overloaded/i.test(message);

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
  let result: { ok: false; reason: "busy" | "invalid" | "error" } = { ok: false, reason: "busy" };
  for (const model of [MODEL, ...FALLBACK_MODELS]) {
    const res = await callModel(model, parts, schema, opts);
    if (res.ok || res.reason !== "busy") return res;
    result = res;
  }
  return result;
}

async function callModel<T extends z.ZodType>(
  model: string,
  parts: AiPart[],
  schema: T,
  opts: { system?: string; temperature?: number }
): Promise<{ ok: true; data: z.infer<T> } | { ok: false; reason: "busy" | "invalid" | "error" }> {
  try {
    const res = await gemini().models.generateContent({
      model,
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
    console.error(`[ai] ${model} failed:`, message.slice(0, 300));
    return { ok: false, reason: isBusy(message) ? "busy" : "error" };
  }
}
