import { z } from "zod";
import { geminiChat } from "@/lib/ai";
import { emergencyReply, familySnapshot, forSpeech, systemPrompt } from "@/lib/assistant";
import { getContext } from "@/lib/context";

const schema = z.object({
  language: z.string().min(2).max(10).default("en-IN"),
  messages: z
    .array(z.object({ role: z.enum(["user", "model"]), text: z.string().trim().min(1).max(2000) }))
    .min(1)
    .max(30)
    .refine((m) => m[m.length - 1].role === "user", "The last message must be from the user."),
});

export type AssistantReply = { reply: string; source: "ai" | "rules" | "offline"; emergency?: boolean };

/** The Pulse assistant: safety rules first, then Gemini with the family's own data. */
export async function POST(request: Request) {
  const ctx = await getContext();
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Invalid message." }, { status: 400 });
  const { messages, language } = parsed.data;
  const last = messages[messages.length - 1].text;

  const emergency = emergencyReply(last, language);
  if (emergency) return Response.json({ reply: emergency, source: "rules", emergency: true } satisfies AssistantReply);

  const snapshot = await familySnapshot(ctx);
  // Gemini needs the conversation to start with the user.
  const turns = messages.slice(messages.findIndex((m) => m.role === "user"));
  const res = await geminiChat(turns, { system: systemPrompt(ctx, snapshot, language) });
  if (!res.ok) {
    const reply =
      res.reason === "disabled"
        ? "The AI assistant isn't set up yet. Ask your admin to add a Gemini API key. Meanwhile, the Dashboard shows today's medicines and appointments."
        : res.reason === "busy"
          ? "I'm a little busy right now. Please try again in a minute."
          : "Sorry, I couldn't answer that just now. Please try again.";
    return Response.json({ reply, source: "offline" } satisfies AssistantReply);
  }
  return Response.json({ reply: forSpeech(res.text), source: "ai" } satisfies AssistantReply, { headers: { "Cache-Control": "no-store" } });
}
