import { z } from "zod";
import { geminiSpeech } from "@/lib/ai";
import { forSpeech } from "@/lib/assistant";
import { getContext } from "@/lib/context";

const schema = z.object({
  text: z.string().trim().min(1).max(1500),
  language: z.string().min(2).max(10).default("en-IN"),
});

// Delivery goes in speechMetadata.style; Gemini 3.8 TTS speaks the text itself verbatim.
const STYLE = "Warm, calm and reassuring, like a kind family nurse. Unhurried pace with clear pronunciation for older listeners.";

/** Gemini TTS for assistant replies. 503 tells the client to fall back to the device voice. */
export async function POST(request: Request) {
  await getContext();
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return new Response("Invalid text.", { status: 400 });
  const { text, language } = parsed.data;
  const res = await geminiSpeech(forSpeech(text), { style: STYLE, languageCode: language.slice(0, 2) });
  if (!res.ok) return new Response(res.reason, { status: res.reason === "busy" ? 429 : 503 });
  return new Response(res.audio as BodyInit, { headers: { "Content-Type": res.mimeType, "Cache-Control": "no-store" } });
}
