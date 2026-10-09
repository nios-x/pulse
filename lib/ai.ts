import "server-only";
import { GoogleGenAI, ThinkingLevel } from "@google/genai";
import { z } from "zod";

/**
 * Gemini, used for reading prescriptions, phrasing triage advice and the Pulse assistant.
 * Structured calls return JSON validated against a zod schema; anything else is discarded.
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
// A conversation can't wait as long as a scan: a slow model is treated like a busy one and the next is tried.
const CHAT_TIMEOUT_MS = 15_000;
const isSlowOrBusy = (message: string) => isBusy(message) || /abort|timeout|timed out/i.test(message);

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

export type ChatTurn = { role: "user" | "model"; text: string };

/** Plain-text conversation (the assistant). Falls back through the same models as geminiJson. */
export async function geminiChat(
  turns: ChatTurn[],
  opts: { system?: string; temperature?: number } = {}
): Promise<{ ok: true; text: string } | { ok: false; reason: "disabled" | "busy" | "error" }> {
  if (!aiEnabled()) return { ok: false, reason: "disabled" };
  let reason: "busy" | "error" = "busy";
  for (const model of [MODEL, ...FALLBACK_MODELS]) {
    try {
      const res = await gemini().models.generateContent({
        model,
        contents: turns.map((t) => ({ role: t.role, parts: [{ text: t.text }] })),
        config: {
          systemInstruction: opts.system,
          temperature: opts.temperature ?? 0.5,
          // Thinking tokens count toward the output cap; keep thinking light so replies stay fast for voice.
          thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
          maxOutputTokens: 2048,
          abortSignal: AbortSignal.timeout(CHAT_TIMEOUT_MS),
        },
      });
      const text = res.text?.trim();
      if (text) return { ok: true, text };
      reason = "error";
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(`[ai] chat ${model} failed:`, message.slice(0, 300));
      if (!isSlowOrBusy(message)) return { ok: false, reason: "error" };
    }
  }
  return { ok: false, reason };
}

const TTS_MODEL = process.env.GEMINI_TTS_MODEL ?? "gemini-3.8-flash-tts";
// Lite is the low-latency tier; used when the flagship voice model is rate-limited.
const TTS_FALLBACK = (process.env.GEMINI_TTS_FALLBACK_MODELS ?? "gemini-3.8-flash-lite-tts")
  .split(",")
  .map((m) => m.trim())
  .filter((m) => m && m !== TTS_MODEL);
export const TTS_VOICE = process.env.GEMINI_TTS_VOICE ?? "Kore";

/**
 * Text to speech with Gemini TTS. The text is spoken verbatim, so delivery goes in
 * speechMetadata.style, never inline. Gemini 3.8 TTS returns WAV; older models return
 * raw PCM (audio/l16), which we wrap in a WAV header so the browser can play either.
 */
export async function geminiSpeech(
  text: string,
  opts: { style?: string; languageCode?: string; voice?: string } = {}
): Promise<{ ok: true; audio: Uint8Array; mimeType: string } | { ok: false; reason: "disabled" | "busy" | "error" }> {
  if (!aiEnabled()) return { ok: false, reason: "disabled" };
  let reason: "busy" | "error" = "busy";
  for (const model of [TTS_MODEL, ...TTS_FALLBACK]) {
    try {
      const res = await gemini().models.generateContent({
        model,
        contents: [{ role: "user", parts: [{ text, speechMetadata: opts.style ? { style: opts.style } : undefined }] }],
        config: {
          responseModalities: ["AUDIO"],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: opts.voice ?? TTS_VOICE } },
            ...(opts.languageCode ? { languageCode: opts.languageCode } : {}),
          },
          abortSignal: AbortSignal.timeout(CHAT_TIMEOUT_MS),
        },
      });
      const part = res.candidates?.[0]?.content?.parts?.find((p) => p.inlineData?.data);
      if (!part?.inlineData?.data) {
        reason = "error";
        continue;
      }
      const bytes = Buffer.from(part.inlineData.data, "base64");
      const mimeType = (part.inlineData.mimeType ?? "audio/wav").toLowerCase();
      if (mimeType.includes("wav")) return { ok: true, audio: new Uint8Array(bytes), mimeType: "audio/wav" };
      if (mimeType.includes("l16") || mimeType.includes("pcm")) {
        const rate = Number(/rate=(\d+)/.exec(mimeType)?.[1] ?? 24000);
        return { ok: true, audio: pcmToWav(bytes, rate), mimeType: "audio/wav" };
      }
      return { ok: true, audio: new Uint8Array(bytes), mimeType };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(`[ai] tts ${model} failed:`, message.slice(0, 300));
      if (!isSlowOrBusy(message)) return { ok: false, reason: "error" };
    }
  }
  return { ok: false, reason };
}

/** 16-bit mono little-endian PCM → WAV. */
function pcmToWav(pcm: Uint8Array, sampleRate: number): Uint8Array {
  const header = Buffer.alloc(44);
  header.write("RIFF", 0);
  header.writeUInt32LE(36 + pcm.length, 4);
  header.write("WAVE", 8);
  header.write("fmt ", 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20);
  header.writeUInt16LE(1, 22);
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(sampleRate * 2, 28);
  header.writeUInt16LE(2, 32);
  header.writeUInt16LE(16, 34);
  header.write("data", 36);
  header.writeUInt32LE(pcm.length, 40);
  return new Uint8Array(Buffer.concat([header, pcm]));
}
