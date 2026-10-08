"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { LifeBuoyIcon, SendHorizontalIcon, SparklesIcon } from "lucide-react";
import { askAssistantAction } from "@/app/(app)/assistant/actions";
import { useT } from "@/components/i18n-provider";
import { Bubble, BubbleContent } from "@/components/ui/bubble";
import { Button } from "@/components/ui/button";
import { Message, MessageContent } from "@/components/ui/message";
import { Textarea } from "@/components/ui/textarea";
import { ASSISTANT_MAX_CHARS, type ChatTurn } from "@/lib/assistant";
import type { MessageKey } from "@/lib/i18n";
import { cn } from "@/lib/utils";

type Entry = ChatTurn & { urgent?: boolean; error?: boolean };

/** The conversation lives only in this tab; reloading the page starts afresh. */
export function AssistantChat({
  patientId,
  suggestions,
}: {
  patientId: string | null;
  suggestions: MessageKey[];
}) {
  const t = useT();
  const [entries, setEntries] = useState<Entry[]>([]);
  const [draft, setDraft] = useState("");
  const [pending, startTransition] = useTransition();
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [entries.length, pending]);

  const send = (text: string) => {
    const question = text.trim();
    if (!question || pending) return;
    const asked: Entry[] = [...entries, { role: "user", text: question }];
    setEntries(asked);
    setDraft("");
    startTransition(async () => {
      // Failed answers are shown but never sent back to the model.
      const history = asked.filter((e) => !e.error).map(({ role, text }) => ({ role, text }));
      const res = await askAssistantAction({ patientId, messages: history }).catch(() => null);
      setEntries((prev) => {
        const next = [...prev];
        if (res?.urgent) next[next.length - 1] = { ...next[next.length - 1], urgent: true };
        next.push(
          res?.ok
            ? { role: "assistant", text: res.reply }
            : { role: "assistant", text: t(res?.error ?? "assistant.error.failed"), error: true }
        );
        return next;
      });
    });
  };

  return (
    <div className="flex flex-col gap-4">
      {entries.length === 0 ? (
        <section aria-labelledby="try-heading" className="flex flex-col gap-2">
          <h2 id="try-heading" className="font-heading text-base font-semibold text-plum">
            {t("assistant.tryAsking")}
          </h2>
          <ul className="flex flex-col gap-2">
            {suggestions.map((key) => (
              <li key={key}>
                <button
                  type="button"
                  onClick={() => send(t(key))}
                  className="sheet flex min-h-12 w-full items-center gap-3 rounded-xl px-4 py-2 text-left text-base text-plum transition-colors hover:bg-violet-wash"
                >
                  <SparklesIcon className="size-4 shrink-0 text-violet" aria-hidden />
                  {t(key)}
                </button>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <div role="log" aria-live="polite" aria-label={t("assistant.title")} className="flex flex-col gap-3">
        {entries.map((e, i) => (
          <div key={i} className="flex flex-col gap-2">
            <Message align={e.role === "user" ? "end" : "start"}>
              <MessageContent>
                <Bubble
                  variant={e.role === "user" ? "default" : e.error ? "destructive" : "outline"}
                  align={e.role === "user" ? "end" : "start"}
                  className="max-w-[88%]"
                >
                  <BubbleContent className="rounded-2xl px-4 py-2.5 text-base leading-relaxed whitespace-pre-line">
                    {e.text}
                  </BubbleContent>
                </Bubble>
              </MessageContent>
            </Message>
            {e.urgent ? (
              // Fixed copy and a link to the help screen; never written by the model.
              <Link
                href="/help"
                className="flex min-h-14 items-center gap-3 rounded-xl bg-alert-wash px-4 py-3 text-base font-semibold text-alert-ink ring-1 ring-alert/25 ring-inset"
              >
                <LifeBuoyIcon className="size-6 shrink-0 text-alert" aria-hidden />
                <span>{t("assistant.urgent")}</span>
              </Link>
            ) : null}
          </div>
        ))}
        {pending ? (
          <p className="flex items-center gap-2 px-1 text-base text-ink-3">
            <SparklesIcon className="size-4 animate-pulse text-violet" aria-hidden />
            {t("assistant.thinking")}
          </p>
        ) : null}
        <div ref={endRef} />
      </div>

      <form
        onSubmit={(ev) => {
          ev.preventDefault();
          send(draft);
        }}
        className="sticky bottom-24 flex items-end gap-2 rounded-2xl bg-card p-2 shadow-card"
      >
        <label htmlFor="assistant-input" className="sr-only">
          {t("assistant.placeholder")}
        </label>
        <Textarea
          id="assistant-input"
          value={draft}
          onChange={(ev) => setDraft(ev.target.value)}
          onKeyDown={(ev) => {
            if (ev.key === "Enter" && !ev.shiftKey && !ev.nativeEvent.isComposing) {
              ev.preventDefault();
              send(draft);
            }
          }}
          placeholder={t("assistant.placeholder")}
          maxLength={ASSISTANT_MAX_CHARS}
          rows={1}
          className="max-h-40 min-h-12 flex-1 resize-none border-0 bg-transparent text-base focus-visible:ring-0 md:text-base"
        />
        <Button
          type="submit"
          size="icon-touch"
          disabled={pending || !draft.trim()}
          aria-label={t("assistant.send")}
          className={cn("shrink-0 rounded-full")}
        >
          <SendHorizontalIcon />
        </Button>
      </form>
    </div>
  );
}
