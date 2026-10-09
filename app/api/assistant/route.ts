import { familyData } from "@/lib/assistant";
import { forgetEverything, forgetFact, loadMemory, memoryEnabled, recentConversations } from "@/lib/assistant-memory";
import { getContext } from "@/lib/context";
import { greeting } from "@/lib/dates";
import { firstName, timeAgo } from "@/lib/labels";

export type AssistantState = {
  memory: boolean;
  greeting: string;
  suggestions: string[];
  conversations: { id: string; title: string; ago: string }[];
  facts: { id: string; text: string; category: string; about: string | null }[];
};

const DEFAULT_SUGGESTIONS = ["Which medicines are due today?", "When is our next doctor's appointment?", "Explain my medicines in simple words", "How are my latest vitals?"];

/** What the chat panel shows when it opens: personalised suggestions, past chats and the knowledge base. */
export async function GET() {
  const ctx = await getContext();
  const [data, memory, conversations] = await Promise.all([familyData(ctx), loadMemory(ctx), recentConversations(ctx)]);
  // Today's alerts first, then what the assistant learned this person tends to ask, then the basics.
  const suggestions = [...new Set([...data.suggestions.slice(0, 2), ...memory.suggestions, ...DEFAULT_SUGGESTIONS])].slice(0, 4);
  const name = (id: string | null) => (id ? firstName(ctx.visibleMembers.find((m) => m.id === id)?.name ?? "") || null : null);
  return Response.json(
    {
      memory: memoryEnabled(ctx),
      greeting: `${greeting()}, ${firstName(ctx.user.name)}`,
      suggestions,
      conversations: conversations.map((c) => ({ id: c.id, title: c.title, ago: timeAgo(c.updatedAt) })),
      facts: memory.facts.map((f) => ({ id: f.id, text: f.text, category: f.category, about: name(f.memberId) })),
    } satisfies AssistantState,
    { headers: { "Cache-Control": "no-store" } }
  );
}

/** ?fact=<id> forgets one fact; with no query it erases the whole knowledge base and chat history. */
export async function DELETE(request: Request) {
  const ctx = await getContext();
  if (!memoryEnabled(ctx)) return new Response("Memory is off while previewing another role.", { status: 403 });
  const fact = new URL(request.url).searchParams.get("fact");
  if (fact) await forgetFact(ctx, fact);
  else await forgetEverything(ctx);
  return new Response(null, { status: 204 });
}
