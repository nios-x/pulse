"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { Mic, MicOff } from "lucide-react";
import { cn } from "@/lib/utils";

type Recognition = {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  maxAlternatives: number;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: ((e: { results: ArrayLike<{ 0: { transcript: string }; isFinal: boolean }>; resultIndex: number }) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
};

function getRecognition(): (new () => Recognition) | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as { SpeechRecognition?: new () => Recognition; webkitSpeechRecognition?: new () => Recognition };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

const ERRORS: Record<string, string> = {
  "not-allowed": "Microphone permission was blocked. Allow it from the lock icon in the address bar, then try again.",
  "service-not-allowed": "This browser doesn't allow voice input here. Try Chrome or Edge, or type instead.",
  "no-speech": "We didn't hear anything. Tap the button and start speaking.",
  "audio-capture": "No microphone was found. Check that one is connected and not used by another app.",
  network: "Voice input needs an internet connection and works in Chrome or Edge (not Brave). You can type instead.",
  "language-not-supported": "Voice input doesn't support this language in your browser. Try English or Hindi, or type instead.",
};

/**
 * A large microphone button: speak in your language and the words are typed for you.
 * Uses the browser's speech recognition (Chrome and Edge on Android and desktop).
 * Spoken words are added after whatever is already in `value`.
 */
const noop = () => () => {};

export function VoiceInput({ lang, value, onChange, className }: { lang: string; value: string; onChange: (text: string) => void; className?: string }) {
  const [listening, setListening] = useState(false);
  const supported = useSyncExternalStore(noop, () => Boolean(getRecognition()), () => true);
  const [error, setError] = useState<string | null>(null);
  const rec = useRef<Recognition | null>(null);

  useEffect(() => () => rec.current?.abort(), []);

  // Stop if the language changes mid-sentence; the next tap uses the new one.
  useEffect(() => {
    rec.current?.abort();
  }, [lang]);

  const toggle = () => {
    if (listening) {
      rec.current?.stop();
      return;
    }
    const R = getRecognition();
    if (!R) return;
    rec.current?.abort();

    const base = value.trimEnd();
    const r = new R();
    r.lang = lang;
    r.interimResults = true;
    r.maxAlternatives = 1;
    // Android Chrome repeats earlier words in continuous mode, so let it end after a pause there.
    r.continuous = !/android/i.test(navigator.userAgent);
    r.onresult = (e) => {
      let spoken = "";
      for (let i = 0; i < e.results.length; i++) spoken += e.results[i][0].transcript;
      spoken = spoken.trim();
      if (spoken) onChange(base ? `${base} ${spoken}` : spoken);
    };
    r.onerror = (e) => {
      if (e.error !== "aborted") setError(ERRORS[e.error] ?? `Voice input stopped (${e.error}). You can type instead.`);
      setListening(false);
    };
    r.onend = () => {
      if (rec.current === r) rec.current = null;
      setListening(false);
    };
    rec.current = r;
    setError(null);
    try {
      r.start();
      setListening(true);
    } catch {
      rec.current = null;
      setError("Couldn't start the microphone. Wait a moment and try again.");
    }
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
