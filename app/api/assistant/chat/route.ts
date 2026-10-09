import { randomUUID } from "node:crypto";
import { after } from "next/server";
import { z } from "zod";
import { geminiChat } from "@/lib/ai";
import { emergencyReply, familyData, forSpeech, systemPrompt } from "@/lib/assistant";
import { knowledgePrompt, loadMemory, recentConversations, refreshMemory, saveTurn } from "@/lib/assistant-memory";
import { getContext } from "@/lib/context";

// The reply is sent first; saving the chat and updating the knowledge base run after it.
export const maxDuration = 60;

const schema = z.object({
  conversationId: z.uuid().optional(),
  language: z.string().min(2).max(10).default("en-IN"),
  messages: z
    .array(z.object({ role: z.enum(["user", "model"]), text: z.string().trim().min(1).max(2000) }))
    .min(1)
    .max(30)
    .refine((m) => m[m.length - 1].role === "user", "The last message must be from the user."),
});

export type AssistantReply = { conversationId: string; reply: string; source: "ai" | "rules" | "offline"; emergency?: boolean };

/** The Pulse assistant: safety rules first, then Gemini with the family's data and this user's knowledge base. */
export async function POST(request: Request) {
  const ctx = await getContext();
  const askedAt = new Date();
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Invalid message." }, { status: 400 });
  const { messages, language } = parsed.data;
  const conversationId = parsed.data.conversationId ?? randomUUID();
  const last = messages[messages.length - 1].text;

  const emergency = emergencyReply(last, language);
  if (emergency) {
    after(() => saveTurn(ctx, { conversationId, language, user: { text: last, at: askedAt }, reply: { text: emergency, at: new Date(), emergency: true } }));
    return Response.json({ conversationId, reply: emergency, source: "rules", emergency: true } satisfies AssistantReply);
  }

  const [data, memory, conversations] = await Promise.all([familyData(ctx), loadMemory(ctx), recentConversations(ctx)]);
  // Gemini needs the conversation to start with the user.
  const turns = messages.slice(messages.findIndex((m) => m.role === "user"));
  const system = systemPrompt(ctx, data.snapshot, language, knowledgePrompt(ctx, memory, conversations, conversationId));
  const res = await geminiChat(turns, { system });
  if (!res.ok) {
    const reply =
      res.reason === "disabled"
        ? "The AI assistant isn't set up yet. Ask your admin to add a Gemini API key. Meanwhile, the Dashboard shows today's medicines and appointments."
        : res.reason === "busy"
          ? "I'm a little busy right now. Please try again in a minute."
          : "Sorry, I couldn't answer that just now. Please try again.";
    return Response.json({ conversationId, reply, source: "offline" } satisfies AssistantReply);
  }

  const reply = forSpeech(res.text);
  after(async () => {
    const saved = await saveTurn(ctx, { conversationId, language, user: { text: last, at: askedAt }, reply: { text: reply, at: new Date(), emergency: false } });
    if (saved) await refreshMemory(ctx, conversationId, [...turns, { role: "model", text: reply }], language);
  });
  return Response.json({ conversationId, reply, source: "ai" } satisfies AssistantReply, { headers: { "Cache-Control": "no-store" } });
}
