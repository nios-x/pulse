"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { Mic, MicOff } from "lucide-react";
import { cn } from "@/lib/utils";

type Recognition = {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  start: () => void;
  stop: () => void;
  onresult: ((e: { results: ArrayLike<{ 0: { transcript: string }; isFinal: boolean }>; resultIndex: number }) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
};

function getRecognition(): (new () => Recognition) | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as { SpeechRecognition?: new () => Recognition; webkitSpeechRecognition?: new () => Recognition };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

/**
 * A large microphone button: speak in your language and the words are typed for you.
 * Uses the browser's speech recognition (Chrome and Edge on Android and desktop).
 */
const noop = () => () => {};

export function VoiceInput({ lang, onText, className }: { lang: string; onText: (text: string, final: boolean) => void; className?: string }) {
  const [listening, setListening] = useState(false);
  const supported = useSyncExternalStore(noop, () => Boolean(getRecognition()), () => true);
  const [error, setError] = useState<string | null>(null);
  const rec = useRef<Recognition | null>(null);

  useEffect(() => () => rec.current?.stop(), []);

  const toggle = () => {
    if (listening) {
      rec.current?.stop();
      return;
    }
    const R = getRecognition();
    if (!R) return;
    const r = new R();
    r.lang = lang;
    r.interimResults = true;
    r.continuous = false;
    r.onresult = (e) => {
      let text = "";
      let final = false;
      for (let i = 0; i < e.results.length; i++) {
        text += e.results[i][0].transcript;
        if (e.results[i].isFinal) final = true;
      }
      onText(text, final);
    };
    r.onerror = (e) => {
      setError(e.error === "not-allowed" ? "Microphone permission was blocked. Allow it in the browser settings." : e.error === "no-speech" ? "We didn't hear anything. Try again." : "Voice input stopped. You can type instead.");
      setListening(false);
    };
    r.onend = () => setListening(false);
    rec.current = r;
    setError(null);
    r.start();
    setListening(true);
  };

  if (!supported) {
    return <p className="text-sm text-muted-foreground">Voice input works in Chrome or Edge. You can type instead.</p>;
  }

  return (
    <div className={cn("flex flex-col items-start gap-2", className)}>
      <button
        type="button"
        onClick={toggle}
        aria-pressed={listening}
        className={cn(
          "inline-flex min-h-12 cursor-pointer items-center gap-2.5 rounded-full border px-5 text-base font-medium transition-colors duration-150",
          listening ? "border-danger-border bg-danger-soft text-danger" : "border-primary/40 bg-accent text-accent-foreground hover:bg-primary-soft"
        )}
      >
        {listening ? (
          <>
            <span className="relative flex size-3">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-danger opacity-60 motion-reduce:hidden" />
              <span className="relative inline-flex size-3 rounded-full bg-danger" />
            </span>
            Listening… tap to stop
            <MicOff className="size-5" aria-hidden="true" />
          </>
        ) : (
          <>
            <Mic className="size-5" aria-hidden="true" /> Speak instead of typing
          </>
        )}
      </button>
      {error && <p role="alert" className="text-sm text-danger">{error}</p>}
    </div>
  );
}
