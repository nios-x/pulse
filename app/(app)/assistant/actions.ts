"use server";

import { requireUser } from "@/lib/auth";
import { ASSISTANT_RATE, buildSystemPrompt, looksUrgent, plainReply, trimHistory } from "@/lib/assistant";
import { loadAssistantContext } from "@/lib/assistant-context";
import { askAssistant, assistantEnabled } from "@/lib/gemini";
import type { MessageKey } from "@/lib/i18n";
import { getLocale } from "@/lib/i18n-server";
import { assistantSchema } from "@/lib/validators";

export type AssistantReply =
  | { ok: true; reply: string; urgent: boolean }
  | { ok: false; error: MessageKey; urgent: boolean };

// Per server process, so it is a brake, not a quota. Enough for a family app on one server.
const recent = new Map<string, number[]>();
function overLimit(userId: string, at: number): boolean {
  const since = at - ASSISTANT_RATE.windowMs;
  const times = (recent.get(userId) ?? []).filter((t) => t > since);
  const over = times.length >= ASSISTANT_RATE.limit;
  if (!over) times.push(at);
  recent.set(userId, times);
  return over;
}

/** One answer from Pulse Assistant. Nothing is stored: the chat lives in the browser tab. */
export async function askAssistantAction(input: { patientId: string | null; messages: unknown }): Promise<AssistantReply> {
  const user = await requireUser();
  const parsed = assistantSchema.safeParse(input);
  if (!parsed.success) {
    const tooLong = parsed.error.issues.some((i) => i.message === "assistant.error.tooLong");
    return { ok: false, error: tooLong ? "assistant.error.tooLong" : "assistant.error.failed", urgent: false };
  }
  const question = parsed.data.messages.at(-1)!.text;
  // Decided by fixed code, not the model: urgent words always bring up "Need help now".
  const urgent = looksUrgent(question);

  if (!assistantEnabled()) return { ok: false, error: "assistant.error.off", urgent };
  const at = Date.now();
  if (overLimit(user.id, at)) return { ok: false, error: "assistant.error.slowDown", urgent };

  const locale = await getLocale();
  const context = await loadAssistantContext(user, parsed.data.patientId, locale, new Date(at));
  const reply = await askAssistant(buildSystemPrompt(context, locale), trimHistory(parsed.data.messages));
  if (reply === "busy") return { ok: false, error: "assistant.error.busy", urgent };
  if (!reply) return { ok: false, error: "assistant.error.failed", urgent };
  return { ok: true, reply: plainReply(reply), urgent };
}
