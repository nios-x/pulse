"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { Square, Volume2 } from "lucide-react";
import { Button } from "@/components/ui/button";

/** Reads text aloud with the device's own voice, in the chosen language when available. */
const noop = () => () => {};

export function SpeakButton({ text, lang = "en-IN", label = "Read aloud", size = "sm" }: { text: string; lang?: string; label?: string; size?: "sm" | "default" }) {
  const [speaking, setSpeaking] = useState(false);
  const supported = useSyncExternalStore(noop, () => "speechSynthesis" in window, () => false);
  useEffect(() => {
    return () => {
      if (typeof window !== "undefined" && "speechSynthesis" in window) window.speechSynthesis.cancel();
    };
  }, []);
  if (!supported) return null;
  const toggle = () => {
    const synth = window.speechSynthesis;
    if (speaking) {
      synth.cancel();
      setSpeaking(false);
      return;
    }
    const u = new SpeechSynthesisUtterance(text);
    u.lang = lang;
    u.rate = 0.92; // a little slower for older listeners
    const voice = synth.getVoices().find((v) => v.lang === lang) ?? synth.getVoices().find((v) => v.lang.startsWith(lang.slice(0, 2)));
    if (voice) u.voice = voice;
    u.onend = () => setSpeaking(false);
    u.onerror = () => setSpeaking(false);
    synth.cancel();
    synth.speak(u);
    setSpeaking(true);
  };
  return (
    <Button type="button" variant="outline" size={size} onClick={toggle} aria-pressed={speaking}>
      {speaking ? <Square aria-hidden="true" /> : <Volume2 aria-hidden="true" />}
      {speaking ? "Stop" : label}
    </Button>
  );
}
