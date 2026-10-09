"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Brain, History, LoaderCircle, Mic, SendHorizontal, Sparkles, Square, SquarePen, Trash2, TriangleAlert, Volume2, VolumeX, X } from "lucide-react";
import type { AssistantReply } from "@/app/api/assistant/chat/route";
import type { AssistantState } from "@/app/api/assistant/route";
import { LANGUAGES } from "@/lib/languages";
import { cn } from "@/lib/utils";

type Msg = { id: string; role: "user" | "model"; text: string; emergency?: boolean };
type Phase = "idle" | "listening" | "thinking" | "speaking";
type View = "chat" | "history" | "memory";

const TABS = [
  { key: "chat", label: "Chat", icon: Sparkles },
  { key: "history", label: "History", icon: History },
  { key: "memory", label: "About you", icon: Brain },
] as const;

type Recognition = {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: ((e: { results: ArrayLike<{ 0: { transcript: string } }> }) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
};

function getRecognition(): (new () => Recognition) | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as { SpeechRecognition?: new () => Recognition; webkitSpeechRecognition?: new () => Recognition };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

const MIC_ERRORS: Record<string, string> = {
  "not-allowed": "Microphone permission is blocked. Allow it from the lock icon in the address bar.",
  "service-not-allowed": "This browser doesn't allow voice input here. Try Chrome or Edge, or type instead.",
  "audio-capture": "No microphone was found.",
  network: "Voice input needs an internet connection and works in Chrome or Edge.",
  "language-not-supported": "Voice input doesn't support this language in your browser. Try English or Hindi.",
};

const PREFS_KEY = "pulse.assistant";
const iconButton = "flex size-10 shrink-0 cursor-pointer items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground";

function Loading() {
  return (
    <p className="flex items-center gap-2 px-1 text-sm text-muted-foreground">
      <LoaderCircle className="size-4 animate-spin motion-reduce:animate-none" aria-hidden="true" /> Loading…
    </p>
  );
}

// Per-device preferences only; the conversation itself is never stored.
function readPrefs(): { voiceOn?: boolean; language?: string } {
  try {
    const saved = JSON.parse(localStorage.getItem(PREFS_KEY) ?? "{}") as { voiceOn?: unknown; language?: unknown };
    return {
      voiceOn: typeof saved.voiceOn === "boolean" ? saved.voiceOn : undefined,
      language: LANGUAGES.find((l) => l.code === saved.language)?.code,
    };
  } catch {
    return {};
  }
}
const newId = () => Math.random().toString(36).slice(2);

/**
 * The Pulse assistant: a floating chat in the bottom-right corner. Type or talk.
 * Talk mode listens, sends when you pause, reads the reply aloud with Gemini TTS,
 * then listens again until you tap stop. It remembers the last 10 chats and what it
 * has learned about the user, all of which they can review and erase here.
 */
export function AssistantWidget({ userName }: { userName: string }) {
  const first = userName.split(" ")[0];
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<View>("chat");
  const [state, setState] = useState<AssistantState | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [confirmForget, setConfirmForget] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [draft, setDraft] = useState("");
  const [phase, setPhase] = useState<Phase>("idle");
  const [talk, setTalk] = useState(false);
  // Read lazily: nothing that depends on these renders until the panel is opened.
  const [voiceOn, setVoiceOn] = useState(() => readPrefs().voiceOn ?? true);
  const [language, setLanguage] = useState<string>(() => readPrefs().language ?? "en-IN");
  const [notice, setNotice] = useState<string | null>(null);
  const [speakingId, setSpeakingId] = useState<string | null>(null);

  const messagesRef = useRef<Msg[]>([]);
  // The server stores the chat under this id; null until the first reply of a new chat.
  const conversationId = useRef<string | null>(null);
  const settings = useRef({ talk: false, voiceOn: true, language: "en-IN" });
  const rec = useRef<Recognition | null>(null);
  // Set when stop is tapped mid-sentence: send what was heard, then don't listen again.
  const finishing = useRef(false);
  const audio = useRef<HTMLAudioElement | null>(null);
  const stopAudio = useRef<() => void>(() => {});
  const audioCache = useRef(new Map<string, string>());
  const request = useRef<AbortController | null>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const launcherRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    settings.current = { talk, voiceOn, language };
  }, [talk, voiceOn, language]);

  useEffect(() => {
    try {
      localStorage.setItem(PREFS_KEY, JSON.stringify({ voiceOn, language }));
    } catch {}
  }, [voiceOn, language]);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, phase]);

  useEffect(() => {
    if (open && view === "chat") inputRef.current?.focus();
  }, [open, view]);

  useEffect(() => {
    const cache = audioCache.current;
    return () => {
      rec.current?.abort();
      stopAudio.current();
      request.current?.abort();
      for (const url of cache.values()) URL.revokeObjectURL(url);
    };
  }, []);

  const commit = (next: Msg[]) => {
    messagesRef.current = next;
    setMessages(next);
  };

  const setConversation = (id: string | null) => {
    conversationId.current = id;
    setActiveId(id);
  };

  /** Personalised suggestions, past chats and the knowledge base. */
  async function loadState() {
    try {
      const res = await fetch("/api/assistant", { cache: "no-store" });
      if (res.ok && !res.redirected) setState((await res.json()) as AssistantState);
    } catch {}
  }

  function openPanel() {
    setOpen(true);
    void loadState();
  }

  function newChat() {
    haltAll();
    commit([]);
    setConversation(null);
    setDraft("");
    setNotice(null);
    setView("chat");
    void loadState();
  }

  async function openConversation(id: string) {
    haltAll();
    setNotice(null);
    try {
      const res = await fetch(`/api/assistant/conversations/${id}`, { cache: "no-store" });
      if (!res.ok) throw new Error(String(res.status));
      const data = (await res.json()) as { messages: Msg[] };
      commit(data.messages);
      setConversation(id);
    } catch {
      setNotice("Couldn't open that chat. It may have been deleted.");
    }
    setView("chat");
  }

  async function removeConversation(id: string) {
    setState((s) => s && { ...s, conversations: s.conversations.filter((c) => c.id !== id) });
    if (conversationId.current === id) {
      commit([]);
      setConversation(null);
    }
    await fetch(`/api/assistant/conversations/${id}`, { method: "DELETE" }).catch(() => {});
  }

  async function forgetFact(id: string) {
    setState((s) => s && { ...s, facts: s.facts.filter((f) => f.id !== id) });
    await fetch(`/api/assistant?fact=${encodeURIComponent(id)}`, { method: "DELETE" }).catch(() => {});
  }

  async function forgetAll() {
    if (!confirmForget) {
      setConfirmForget(true);
      return;
    }
    setConfirmForget(false);
    await fetch("/api/assistant", { method: "DELETE" }).catch(() => {});
    newChat();
    setView("memory");
  }

  function haltAll() {
    settings.current.talk = false;
    setTalk(false);
    rec.current?.abort();
    rec.current = null;
    stopAudio.current();
    request.current?.abort();
    setPhase("idle");
  }

  function close() {
    haltAll();
    setOpen(false);
    setConfirmForget(false);
    launcherRef.current?.focus();
  }

  /** Plays a reply: Gemini TTS first, the device's own voice if that isn't available. Resolves when done. */
  async function speak(msg: Msg): Promise<void> {
    stopAudio.current();
    setSpeakingId(msg.id);
    setPhase("speaking");
    try {
      let url = audioCache.current.get(msg.id);
      if (!url) {
        const res = await fetch("/api/assistant/speech", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: msg.text, language: settings.current.language }),
        });
        if (!res.ok) throw new Error(String(res.status));
        url = URL.createObjectURL(await res.blob());
        audioCache.current.set(msg.id, url);
      }
      const el = new Audio(url);
      audio.current = el;
      await new Promise<void>((resolve) => {
        stopAudio.current = () => {
          el.pause();
          resolve();
        };
        el.onended = () => resolve();
        el.onerror = () => resolve();
        el.play().catch(() => resolve());
      });
    } catch {
      await speakWithDevice(msg.text);
    } finally {
      audio.current = null;
      stopAudio.current = () => {};
      setSpeakingId((id) => (id === msg.id ? null : id));
    }
  }

  function speakWithDevice(text: string): Promise<void> {
    if (!("speechSynthesis" in window)) return Promise.resolve();
    const synth = window.speechSynthesis;
    const lang = settings.current.language;
    return new Promise((resolve) => {
      const u = new SpeechSynthesisUtterance(text);
      u.lang = lang;
      u.rate = 0.95;
      const voice = synth.getVoices().find((v) => v.lang === lang) ?? synth.getVoices().find((v) => v.lang.startsWith(lang.slice(0, 2)));
      if (voice) u.voice = voice;
      u.onend = () => resolve();
      u.onerror = () => resolve();
      stopAudio.current = () => {
        synth.cancel();
        resolve();
      };
      synth.cancel();
      synth.speak(u);
    });
  }

  async function send(raw: string) {
    const text = raw.trim();
    if (!text) return;
    setDraft("");
    setNotice(null);
    stopAudio.current();
    const next = [...messagesRef.current, { id: newId(), role: "user" as const, text }];
    commit(next);
    setPhase("thinking");
    request.current?.abort();
    const ac = new AbortController();
    request.current = ac;

    let reply: Msg;
    try {
      const res = await fetch("/api/assistant/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          conversationId: conversationId.current ?? undefined,
          language: settings.current.language,
          messages: next.slice(-20).map(({ role, text }) => ({ role, text })),
        }),
        signal: ac.signal,
      });
      if (!res.ok || res.redirected) throw new Error(String(res.status));
      const data = (await res.json()) as AssistantReply;
      setConversation(data.conversationId);
      reply = { id: newId(), role: "model", text: data.reply, emergency: data.emergency };
    } catch (err) {
      if (ac.signal.aborted) return;
      console.error(err);
      reply = { id: newId(), role: "model", text: "Sorry, I couldn't reach the assistant. Check your connection and try again." };
    }
    commit([...messagesRef.current, reply]);

    if (settings.current.voiceOn || settings.current.talk) await speak(reply);
    if (settings.current.talk && !reply.emergency) listen();
    else {
      if (reply.emergency) haltAll();
      setPhase("idle");
    }
  }

  function listen() {
    const R = getRecognition();
    if (!R) {
      haltAll();
      setNotice("Talking works in Chrome or Edge. You can type instead.");
      return;
    }
    rec.current?.abort();
    const r = new R();
    r.lang = settings.current.language;
    r.interimResults = true;
    // One utterance at a time: it ends when you pause, and that sends the message.
    r.continuous = false;
    let heard = "";
    r.onresult = (e) => {
      let s = "";
      for (let i = 0; i < e.results.length; i++) s += e.results[i][0].transcript;
      heard = s;
      setDraft(s);
    };
    r.onerror = (e) => {
      if (e.error === "aborted" || e.error === "no-speech") return;
      setNotice(MIC_ERRORS[e.error] ?? `Voice input stopped (${e.error}). You can type instead.`);
      settings.current.talk = false;
      setTalk(false);
    };
    r.onend = () => {
      if (rec.current !== r) return;
      rec.current = null;
      const last = finishing.current;
      finishing.current = false;
      if (heard.trim() && (settings.current.talk || last)) {
        void send(heard);
      } else {
        // Silence ends talk mode rather than listening forever.
        settings.current.talk = false;
        setTalk(false);
        setPhase("idle");
      }
    };
    rec.current = r;
    try {
      r.start();
      setPhase("listening");
    } catch {
      rec.current = null;
      haltAll();
      setNotice("Couldn't start the microphone. Wait a moment and try again.");
    }
  }

  function toggleTalk() {
    if (talk) {
      // Tapping stop while listening still sends what was heard.
      if (phase === "listening" && rec.current) {
        finishing.current = true;
        settings.current.talk = false;
        setTalk(false);
        rec.current.stop();
        return;
      }
      haltAll();
      return;
    }
    setNotice(null);
    stopAudio.current();
    settings.current.talk = true;
    setTalk(true);
    listen();
  }

  function toggleVoice() {
    if (voiceOn) stopAudio.current();
    setVoiceOn(!voiceOn);
  }

  const suggestions = state?.suggestions ?? ["Which medicines are due today?", "When is our next doctor's appointment?", "Explain my medicines in simple words"];
  const remembers = Boolean(state && (state.facts.length || state.conversations.length));

  const status =
    phase === "listening" ? "Listening… pause when you're done" : phase === "thinking" ? "Thinking…" : phase === "speaking" ? "Speaking…" : null;

  return (
    <>
      <button
        ref={launcherRef}
        type="button"
        onClick={() => (open ? close() : openPanel())}
        aria-expanded={open}
        aria-controls="pulse-assistant"
        aria-label={open ? "Close the Pulse assistant" : "Open the Pulse assistant"}
        className={cn(
          "no-print fixed right-4 bottom-[calc(5.5rem+env(safe-area-inset-bottom))] z-40 flex size-14 cursor-pointer items-center justify-center rounded-full bg-brand text-brand-foreground shadow-pop transition-transform duration-200 ease-(--ease-out-soft) hover:scale-105 active:scale-95 motion-reduce:transition-none lg:right-6 lg:bottom-6",
          open && "max-sm:hidden"
        )}
      >
        {open ? <X className="size-6" aria-hidden="true" /> : <Sparkles className="size-6" aria-hidden="true" />}
        {!open && talk && <span className="absolute inset-0 animate-ping rounded-full bg-brand opacity-30 motion-reduce:hidden" />}
      </button>

      {open && (
        <section
          id="pulse-assistant"
          role="dialog"
          aria-label="Pulse assistant"
          onKeyDown={(e) => e.key === "Escape" && close()}
          className="no-print fixed inset-x-2 top-2 bottom-[calc(5.25rem+env(safe-area-inset-bottom))] z-50 flex animate-rise flex-col overflow-hidden rounded-2xl border border-border bg-card text-card-foreground shadow-pop sm:inset-x-auto sm:top-auto sm:right-4 sm:bottom-[calc(9.5rem+env(safe-area-inset-bottom))] sm:h-[min(40rem,calc(100dvh-11rem))] sm:w-[25rem] lg:right-6 lg:bottom-24 lg:h-[min(40rem,calc(100dvh-8rem))]"
        >
          <header className="flex items-center gap-3 border-b border-border px-4 py-3">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-brand-soft text-brand">
              <Sparkles className="size-5" aria-hidden="true" />
            </span>
            <div className="min-w-0 flex-1">
              <h2 className="font-heading text-base leading-tight font-semibold">Pulse assistant</h2>
              <p className="truncate text-sm text-muted-foreground" aria-live="polite">
                {status ?? `For ${first} and the family`}
              </p>
            </div>
            <button
              type="button"
              onClick={toggleVoice}
              aria-pressed={voiceOn}
              aria-label={voiceOn ? "Read replies aloud: on" : "Read replies aloud: off"}
              title={voiceOn ? "Replies are read aloud" : "Replies are silent"}
              className={iconButton}
            >
              {voiceOn ? <Volume2 className="size-5" aria-hidden="true" /> : <VolumeX className="size-5" aria-hidden="true" />}
            </button>
            <button type="button" onClick={close} aria-label="Close" className={iconButton}>
              <X className="size-5" aria-hidden="true" />
            </button>
          </header>

          <nav aria-label="Assistant" className="flex items-center gap-1 border-b border-border px-2 py-1.5">
            {TABS.map((t) => (
              <button
                key={t.key}
                type="button"
                onClick={() => {
                  setView(t.key);
                  setConfirmForget(false);
                }}
                aria-current={view === t.key ? "page" : undefined}
                className={cn(
                  "flex min-h-9 cursor-pointer items-center gap-1.5 rounded-lg px-2.5 text-sm font-medium transition-colors",
                  view === t.key ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                <t.icon className="size-4" aria-hidden="true" />
                {t.label}
              </button>
            ))}
            <button
              type="button"
              onClick={newChat}
              className="ml-auto flex min-h-9 cursor-pointer items-center gap-1.5 rounded-lg px-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <SquarePen className="size-4" aria-hidden="true" />
              New chat
            </button>
          </nav>

          {view === "history" && (
            <div className="flex-1 overflow-y-auto overscroll-contain px-3 py-3">
              {!state ? (
                <Loading />
              ) : !state.memory ? (
                <p className="px-1 text-sm text-muted-foreground">Chat history is off while you preview another role.</p>
              ) : state.conversations.length === 0 ? (
                <p className="px-1 text-sm text-muted-foreground">No past chats yet. Pulse keeps your last 10 chats, encrypted, so it can pick up where you left off.</p>
              ) : (
                <>
                  <p className="mb-2 px-1 text-sm text-muted-foreground">Your recent chats. Only the newest 10 are kept.</p>
                  <ul className="space-y-1">
                    {state.conversations.map((c) => (
                      <li key={c.id} className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => void openConversation(c.id)}
                          className={cn("min-h-12 min-w-0 flex-1 cursor-pointer rounded-xl px-3 py-2 text-left transition-colors hover:bg-muted", activeId === c.id && "bg-surface")}
                        >
                          <span className="block truncate text-base font-medium">{c.title}</span>
                          <span className="block text-sm text-muted-foreground">{c.ago}</span>
                        </button>
                        <button type="button" onClick={() => void removeConversation(c.id)} aria-label={`Delete chat: ${c.title}`} className={iconButton}>
                          <Trash2 className="size-4" aria-hidden="true" />
                        </button>
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </div>
          )}

          {view === "memory" && (
            <div className="flex-1 space-y-4 overflow-y-auto overscroll-contain px-4 py-4">
              {!state ? (
                <Loading />
              ) : !state.memory ? (
                <p className="text-sm text-muted-foreground">Memory is off while you preview another role.</p>
              ) : (
                <>
                  <div>
                    <h3 className="font-heading text-base font-semibold">What Pulse knows about you</h3>
                    <p className="text-sm text-muted-foreground">
                      Learned from your chats to personalise answers, alongside your family&apos;s health records. Only you can see this, and it&apos;s stored encrypted.
                    </p>
                  </div>
                  {state.facts.length === 0 ? (
                    <p className="rounded-xl bg-surface px-3.5 py-3 text-sm">
                      Nothing yet. Just chat, or tell me things like &ldquo;I prefer answers in Hindi&rdquo; or &ldquo;I walk every morning at 6&rdquo;.
                    </p>
                  ) : (
                    <ul className="space-y-1.5">
                      {state.facts.map((f) => (
                        <li key={f.id} className="flex items-start gap-2 rounded-xl bg-surface py-2 pr-1 pl-3.5">
                          <div className="min-w-0 flex-1">
                            <p className="text-sm">{f.text}</p>
                            <p className="text-xs text-muted-foreground capitalize">
                              {f.category}
                              {f.about ? ` · about ${f.about}` : ""}
                            </p>
                          </div>
                          <button type="button" onClick={() => void forgetFact(f.id)} aria-label={`Forget: ${f.text}`} className={cn(iconButton, "size-9")}>
                            <X className="size-4" aria-hidden="true" />
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                  {remembers && (
                    <button
                      type="button"
                      onClick={() => void forgetAll()}
                      className="flex min-h-11 cursor-pointer items-center gap-2 rounded-xl border border-danger-border px-3.5 text-sm font-medium text-danger transition-colors hover:bg-danger-soft"
                    >
                      <Trash2 className="size-4" aria-hidden="true" />
                      {confirmForget ? "Tap again to erase all memory and chats" : "Forget everything"}
                    </button>
                  )}
                </>
              )}
            </div>
          )}

          {view === "chat" && (
            <>
              <div ref={listRef} className="flex-1 space-y-3 overflow-y-auto overscroll-contain px-4 py-4" aria-live="polite">
                {messages.length === 0 && (
                  <div className="space-y-4">
                    <div>
                      <p className="font-heading text-lg font-semibold">{state?.greeting ?? `Hi ${first}`}!</p>
                      <p className="text-base text-muted-foreground">
                        {remembers
                          ? "I remember our recent chats and what matters to you. Here's what I'd look at today."
                          : "I know your family's medicines, vitals and appointments. Ask me anything, or tap the mic and just talk."}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {suggestions.map((s) => (
                        <button
                          key={s}
                          type="button"
                          onClick={() => void send(s)}
                          className="min-h-10 cursor-pointer rounded-full border border-border bg-surface px-3.5 py-1.5 text-left text-sm transition-colors hover:border-primary/40 hover:bg-accent"
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                {messages.map((m) =>
                  m.role === "user" ? (
                    <p key={m.id} className="ml-auto w-fit max-w-[85%] rounded-2xl rounded-br-md bg-brand px-3.5 py-2 text-base text-brand-foreground">
                      {m.text}
                    </p>
                  ) : (
                    <div key={m.id} className="max-w-[90%] space-y-1.5">
                      <div className={cn("rounded-2xl rounded-bl-md px-3.5 py-2 text-base", m.emergency ? "border border-danger-border bg-danger-soft text-danger" : "bg-surface")}>
                        {m.emergency && (
                          <span className="mb-1 flex items-center gap-1.5 font-semibold">
                            <TriangleAlert className="size-4" aria-hidden="true" /> Emergency
                          </span>
                        )}
                        {m.text}
                        {m.emergency && (
                          <span className="mt-2 flex flex-wrap gap-2">
                            <a href="tel:112" className="rounded-lg bg-emergency px-3 py-1.5 text-sm font-semibold text-emergency-foreground">
                              Call 112
                            </a>
                            <Link href="/emergency" onClick={close} className="rounded-lg border border-danger-border px-3 py-1.5 text-sm font-semibold">
                              Emergency card
                            </Link>
                          </span>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => (speakingId === m.id ? stopAudio.current() : void speak(m).then(() => setPhase("idle")))}
                        className="flex min-h-8 cursor-pointer items-center gap-1 rounded-md px-1.5 text-sm text-muted-foreground hover:text-foreground"
                      >
                        {speakingId === m.id ? <Square className="size-3.5" aria-hidden="true" /> : <Volume2 className="size-3.5" aria-hidden="true" />}
                        {speakingId === m.id ? "Stop" : "Listen"}
                      </button>
                    </div>
                  )
                )}
                {phase === "thinking" && (
                  <p className="flex w-fit items-center gap-2 rounded-2xl rounded-bl-md bg-surface px-3.5 py-2 text-sm text-muted-foreground">
                    <LoaderCircle className="size-4 animate-spin motion-reduce:animate-none" aria-hidden="true" /> Thinking…
                  </p>
                )}
              </div>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (talk) haltAll();
                  void send(draft);
                }}
                className="border-t border-border p-3"
              >
                {notice && (
                  <p role="alert" className="mb-2 text-sm text-danger">
                    {notice}
                  </p>
                )}
                <div className="flex items-end gap-2">
                  <button
                    type="button"
                    onClick={toggleTalk}
                    aria-pressed={talk}
                    aria-label={talk ? "Stop talking" : "Talk to the assistant"}
                    className={cn(
                      "relative flex size-11 shrink-0 cursor-pointer items-center justify-center rounded-full border transition-colors",
                      talk ? "border-danger-border bg-danger-soft text-danger" : "border-primary/40 bg-accent text-accent-foreground hover:bg-primary-soft"
                    )}
                  >
                    {phase === "listening" && <span className="absolute inset-0 animate-ping rounded-full bg-danger opacity-25 motion-reduce:hidden" />}
                    {talk ? <Square className="size-4.5" aria-hidden="true" /> : <Mic className="size-5" aria-hidden="true" />}
                  </button>
                  <label htmlFor="assistant-input" className="sr-only">
                    Message
                  </label>
                  <textarea
                    ref={inputRef}
                    id="assistant-input"
                    rows={1}
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        e.currentTarget.form?.requestSubmit();
                      }
                    }}
                    placeholder={phase === "listening" ? "Listening…" : "Ask about medicines, vitals…"}
                    className="max-h-32 min-h-11 flex-1 resize-none rounded-xl border border-input bg-card px-3.5 py-2.5 text-base outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                  />
                  <button
                    type="submit"
                    disabled={!draft.trim() || phase === "thinking"}
                    aria-label="Send"
                    className="flex size-11 shrink-0 cursor-pointer items-center justify-center rounded-full bg-primary text-primary-foreground transition-opacity disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <SendHorizontal className="size-5" aria-hidden="true" />
                  </button>
                </div>
                <div className="mt-2 flex items-center gap-2">
                  <label className="sr-only" htmlFor="assistant-lang">
                    Reply language
                  </label>
                  <select
                    id="assistant-lang"
                    value={language}
                    onChange={(e) => setLanguage(e.target.value)}
                    className="h-8 cursor-pointer rounded-md border border-input bg-card px-1.5 text-sm"
                  >
                    {LANGUAGES.map((l) => (
                      <option key={l.code} value={l.code}>
                        {l.native}
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-muted-foreground">Not a diagnosis. In an emergency, call 112.</p>
                </div>
              </form>
            </>
          )}
        </section>
      )}
    </>
  );
}
