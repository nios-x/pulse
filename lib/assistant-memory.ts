import "server-only";
import { randomUUID } from "node:crypto";
import { and, asc, desc, eq, notInArray } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { assistantConversations, assistantMessages, assistantProfiles } from "@/db/schema";
import { geminiJson } from "@/lib/ai";
import type { AppContext } from "@/lib/context";
import { ageFrom } from "@/lib/dates";
import { decrypt, encrypt } from "@/lib/crypto";
import { firstName, relationLabel, timeAgo } from "@/lib/labels";

/**
 * The assistant's knowledge base for one user: facts it has learned (preferences, routines,
 * goals, worries, who they look after) and their last 10 conversations, each with a summary.
 * Everything is encrypted at rest. The user can see and erase all of it from the chat panel.
 * Memory is off in the admin's "View as" preview, so a preview never reads or writes it.
 */

export const KEEP_CONVERSATIONS = 10;
const MAX_FACTS = 25;

export const FACT_CATEGORIES = ["preference", "routine", "goal", "concern", "care", "lifestyle", "other"] as const;
export type FactCategory = (typeof FACT_CATEGORIES)[number];
export type MemoryFact = { id: string; text: string; category: FactCategory; memberId: string | null; updatedAt: string };
export type AssistantMemory = { facts: MemoryFact[]; suggestions: string[] };
export type StoredMessage = { id: string; role: "user" | "model"; text: string; emergency: boolean };
export type ConversationInfo = { id: string; title: string; summary: string | null; updatedAt: Date };

const EMPTY: AssistantMemory = { facts: [], suggestions: [] };

const seal = (text: string) => encrypt(Buffer.from(text, "utf8"));
const unseal = (blob: Buffer | null) => (blob ? decrypt(blob).toString("utf8") : null);

export function memoryEnabled(ctx: AppContext): boolean {
  return !ctx.viewingAs;
}

/** Facts about people this role can no longer see are hidden, never shown or sent to the model. */
function visibleFacts(ctx: AppContext, facts: MemoryFact[]): MemoryFact[] {
  const ids = new Set(ctx.visibleMembers.map((m) => m.id));
  return facts.filter((f) => !f.memberId || ids.has(f.memberId));
}

export async function loadMemory(ctx: AppContext): Promise<AssistantMemory> {
  if (!memoryEnabled(ctx)) return EMPTY;
  const [row] = await db.select().from(assistantProfiles).where(eq(assistantProfiles.userId, ctx.user.id)).limit(1);
  if (!row || row.familyId !== ctx.family.id) return EMPTY;
  try {
    const mem = JSON.parse(unseal(row.memory) ?? "{}") as Partial<AssistantMemory>;
    return { facts: visibleFacts(ctx, mem.facts ?? []), suggestions: mem.suggestions ?? [] };
  } catch {
    return EMPTY;
  }
}

async function saveMemory(ctx: AppContext, mem: AssistantMemory) {
  const memory = seal(JSON.stringify(mem));
  await db
    .insert(assistantProfiles)
    .values({ userId: ctx.user.id, familyId: ctx.family.id, memory })
    .onConflictDoUpdate({ target: assistantProfiles.userId, set: { familyId: ctx.family.id, memory, updatedAt: new Date() } });
}

export async function recentConversations(ctx: AppContext): Promise<ConversationInfo[]> {
  if (!memoryEnabled(ctx)) return [];
  const rows = await db
    .select({ id: assistantConversations.id, title: assistantConversations.title, summary: assistantConversations.summary, updatedAt: assistantConversations.updatedAt })
    .from(assistantConversations)
    .where(and(eq(assistantConversations.userId, ctx.user.id), eq(assistantConversations.familyId, ctx.family.id)))
    .orderBy(desc(assistantConversations.updatedAt))
    .limit(KEEP_CONVERSATIONS);
  return rows.map((r) => ({ id: r.id, title: unseal(r.title) ?? "New chat", summary: unseal(r.summary), updatedAt: r.updatedAt }));
}

/** Messages of one of this user's conversations, or null if it isn't theirs. */
export async function conversationMessages(ctx: AppContext, id: string): Promise<StoredMessage[] | null> {
  if (!memoryEnabled(ctx)) return null;
  const [conv] = await db
    .select({ id: assistantConversations.id })
    .from(assistantConversations)
    .where(and(eq(assistantConversations.id, id), eq(assistantConversations.userId, ctx.user.id)))
    .limit(1);
  if (!conv) return null;
  const rows = await db.select().from(assistantMessages).where(eq(assistantMessages.conversationId, id)).orderBy(asc(assistantMessages.createdAt));
  return rows.map((r) => ({ id: r.id, role: r.role === "model" ? "model" : "user", text: unseal(r.content) ?? "", emergency: r.emergency }));
}

/**
 * Stores one exchange. Timestamps come from the request, so ordering stays right even if two
 * of these run out of order. Returns false if the conversation id belongs to someone else.
 */
export async function saveTurn(
  ctx: AppContext,
  turn: { conversationId: string; language: string; user: { text: string; at: Date }; reply: { text: string; at: Date; emergency: boolean } }
): Promise<boolean> {
  if (!memoryEnabled(ctx)) return false;
  await db
    .insert(assistantConversations)
    .values({ id: turn.conversationId, userId: ctx.user.id, familyId: ctx.family.id, language: turn.language.slice(0, 8), createdAt: turn.user.at })
    .onConflictDoNothing();
  const [own] = await db
    .update(assistantConversations)
    .set({ updatedAt: turn.reply.at, language: turn.language.slice(0, 8) })
    .where(and(eq(assistantConversations.id, turn.conversationId), eq(assistantConversations.userId, ctx.user.id)))
    .returning({ id: assistantConversations.id });
  if (!own) return false;
  await db.insert(assistantMessages).values([
    { conversationId: own.id, role: "user", content: seal(turn.user.text), createdAt: turn.user.at },
    { conversationId: own.id, role: "model", content: seal(turn.reply.text), emergency: turn.reply.emergency, createdAt: turn.reply.at },
  ]);
  // Keep only the newest conversations.
  const keep = await db
    .select({ id: assistantConversations.id })
    .from(assistantConversations)
    .where(eq(assistantConversations.userId, ctx.user.id))
    .orderBy(desc(assistantConversations.updatedAt))
    .limit(KEEP_CONVERSATIONS);
  await db.delete(assistantConversations).where(
    and(
      eq(assistantConversations.userId, ctx.user.id),
      notInArray(
        assistantConversations.id,
        keep.map((k) => k.id)
      )
    )
  );
  return true;
}

const extraction = z.object({
  title: z.string().max(80),
  summary: z.string().max(500),
  facts: z
    .array(z.object({ text: z.string().max(240), category: z.enum(FACT_CATEGORIES), person: z.string().max(80).nullable() }))
    .max(MAX_FACTS + 5),
  suggestions: z.array(z.string().max(100)).max(4),
});

/**
 * After a reply: re-reads the conversation and updates the knowledge base (facts, a title and
 * summary for this chat, and personalised follow-up questions). Runs after the response is sent.
 */
export async function refreshMemory(ctx: AppContext, conversationId: string, turns: { role: "user" | "model"; text: string }[], language: string) {
  if (!memoryEnabled(ctx)) return;
  const memory = await loadMemory(ctx);
  const people = ctx.visibleMembers.map((m) => `${m.name} (${m.id === ctx.self.id ? "the user" : relationLabel(m.relation, m.sex, false)})`).join(", ");
  const transcript = turns
    .slice(-16)
    .map((t) => `${t.role === "user" ? "User" : "Assistant"}: ${t.text}`)
    .join("\n");
  const known = memory.facts.map((f) => `- [${f.category}] ${f.text}`).join("\n") || "(none yet)";

  const res = await geminiJson(
    [{ text: `People the user can see: ${people}\n\nKnown facts:\n${known}\n\nLatest conversation:\n${transcript}` }],
    extraction,
    {
      system: [
        `You maintain a private knowledge base about ${ctx.user.name}, a user of a family health app, so a health assistant can personalise future chats.`,
        "Return the FULL updated list of facts: keep still-true known facts, add new durable ones from the conversation, merge duplicates, update changed ones, drop contradicted ones.",
        `Keep at most ${MAX_FACTS} facts, each one short sentence in English in the third person (e.g. "Prefers replies in Hindi", "Walks every morning at 6", "Worried about Papa's blood pressure", "Looks after her parents").`,
        "Worth keeping: preferences (language, how they like answers), routines, goals, worries, who they care for, lifestyle (diet, exercise, work shifts) and anything they ask you to remember.",
        "Never store: readings, medicines or appointments (the app already has them), diagnoses or guesses, emergencies, passwords or ID numbers, one-off small talk.",
        "person: the exact name from the people list the fact is about, or null if it is about the user.",
        `title: 2 to 6 words naming what this chat is about. summary: 1 or 2 sentences of what was asked and answered. Both in English.`,
        `suggestions: 3 short questions this user is likely to want to ask next, written as they would type them, in ${language.startsWith("en") ? "English" : `the language of code ${language}`}, specific to their family and facts.`,
      ].join("\n"),
      temperature: 0.2,
    }
  );
  if (!res.ok) return;

  const now = new Date().toISOString();
  const byText = new Map(memory.facts.map((f) => [f.text.toLowerCase(), f]));
  const memberByName = (name: string | null) => {
    if (!name) return null;
    const n = name.toLowerCase();
    const m = ctx.visibleMembers.find((x) => x.name.toLowerCase() === n) ?? ctx.visibleMembers.find((x) => firstName(x.name).toLowerCase() === n.split(" ")[0]);
    return m && m.id !== ctx.self.id ? m.id : null;
  };
  const facts: MemoryFact[] = res.data.facts.slice(0, MAX_FACTS).map((f) => {
    const old = byText.get(f.text.toLowerCase());
    return old ?? { id: randomUUID(), text: f.text, category: f.category, memberId: memberByName(f.person), updatedAt: now };
  });

  await Promise.all([
    saveMemory(ctx, { facts, suggestions: res.data.suggestions.slice(0, 3) }),
    db
      .update(assistantConversations)
      .set({ title: seal(res.data.title), summary: seal(res.data.summary) })
      .where(and(eq(assistantConversations.id, conversationId), eq(assistantConversations.userId, ctx.user.id))),
  ]);
}

export async function forgetFact(ctx: AppContext, factId: string) {
  const memory = await loadMemory(ctx);
  await saveMemory(ctx, { ...memory, facts: memory.facts.filter((f) => f.id !== factId) });
}

export async function deleteConversation(ctx: AppContext, id: string) {
  await db.delete(assistantConversations).where(and(eq(assistantConversations.id, id), eq(assistantConversations.userId, ctx.user.id)));
}

/** Erases the whole knowledge base: facts, suggestions and every conversation. */
export async function forgetEverything(ctx: AppContext) {
  await Promise.all([
    db.delete(assistantProfiles).where(eq(assistantProfiles.userId, ctx.user.id)),
    db.delete(assistantConversations).where(eq(assistantConversations.userId, ctx.user.id)),
  ]);
}

/** The knowledge-base section of the system prompt. */
export function knowledgePrompt(ctx: AppContext, memory: AssistantMemory, conversations: ConversationInfo[], currentId?: string): string {
  const self = ctx.self;
  const age = ageFrom(self.dateOfBirth);
  const lines = [
    `Profile: ${ctx.user.name}${age !== null ? `, ${age} years` : ""}${self.sex ? `, ${self.sex}` : ""}, role "${ctx.role}" in the ${ctx.family.name} family${ctx.family.city ? ` (${ctx.family.city})` : ""}.`,
  ];
  if (memory.facts.length) {
    lines.push("Learned facts:");
    for (const f of memory.facts) lines.push(`- ${f.text}`);
  }
  const past = conversations.filter((c) => c.id !== currentId && c.summary);
  if (past.length) {
    lines.push(`Recent conversations (newest first, up to ${KEEP_CONVERSATIONS}):`);
    for (const c of past) lines.push(`- ${timeAgo(c.updatedAt)}: ${c.title}. ${c.summary}`);
  }
  return lines.join("\n");
}
