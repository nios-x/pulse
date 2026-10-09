"use client";

import { useEffect, useRef, useState } from "react";
import { Check } from "lucide-react";
import { QUEST_ICON } from "@/components/game/quest-icons";
import { burst, buzz, floatLabel, pop } from "@/components/game/rewards";
import type { QuestKey } from "@/lib/gamification";
import { cn } from "@/lib/utils";
import "./pulse-orbit.css";

const RADIUS = 104;
const RING = 2 * Math.PI * 46;

/**
 * Today at a glance, alive: a beating heart whose ring fills with today's quests, and the quests
 * themselves orbiting it, lit once done. Tapping the heart celebrates whatever's been done so far.
 */
export function PulseOrbit({ quests, className }: { quests: { key: QuestKey; title: string; done: boolean }[]; className?: string }) {
  const heart = useRef<HTMLButtonElement>(null);
  const [filled, setFilled] = useState(0);
  const done = quests.filter((q) => q.done).length;
  const total = Math.max(1, quests.length);

  // Fill the ring after first paint so it sweeps in.
  useEffect(() => {
    const raf = requestAnimationFrame(() => setFilled(done / total));
    return () => cancelAnimationFrame(raf);
  }, [done, total]);

  const tap = () => {
    const el = heart.current;
    pop(el, 1);
    burst(el, { kind: done === total ? "stars" : "petals", count: 14 + done * 2, spread: 90 });
    floatLabel(el, done ? `${done} of ${quests.length} today` : "Let's start", "brand");
    buzz();
  };

  return (
    <div className={cn("relative size-64 shrink-0", className)}>
      <span aria-hidden="true" className="orbit-glow absolute inset-10 rounded-full bg-brand/15 blur-2xl" />
      <span aria-hidden="true" className="absolute inset-6 rounded-full border border-dashed border-brand/25" />

      <div aria-hidden="true" className="orbit-spin absolute inset-0">
        {quests.map((q, i) => {
          const a = (i / quests.length) * Math.PI * 2 - Math.PI / 2;
          const Icon = QUEST_ICON[q.key];
          return (
            <span key={q.key} className="absolute -mt-5 -ml-5" style={{ left: `calc(50% + ${Math.cos(a) * RADIUS}px)`, top: `calc(50% + ${Math.sin(a) * RADIUS}px)` }}>
              <span className="orbit-counter block">
                <span
                  title={`${q.title}${q.done ? " · done" : ""}`}
                  className={cn(
                    "reward-rise relative flex size-10 items-center justify-center rounded-full transition-colors duration-300",
                    q.done ? "bg-brand text-brand-foreground shadow-brand" : "border border-border bg-card text-muted-foreground shadow-soft",
                  )}
                  style={{ animationDelay: `${200 + i * 90}ms` }}
                >
                  <Icon className="size-[1.125rem]" aria-hidden="true" />
                  {q.done && (
                    <span className="absolute -right-1 -bottom-1 flex size-4.5 items-center justify-center rounded-full border-2 border-card bg-primary text-primary-foreground">
                      <Check className="size-2.5" strokeWidth={3.5} aria-hidden="true" />
                    </span>
                  )}
                </span>
              </span>
            </span>
          );
        })}
      </div>

      <button
        ref={heart}
        type="button"
        onClick={tap}
        aria-label={`Today's quests: ${done} of ${quests.length} done. Tap to celebrate.`}
        className="absolute top-1/2 left-1/2 flex size-32 -translate-x-1/2 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full transition-transform duration-200 ease-out-soft hover:scale-105 active:scale-95"
      >
        <svg viewBox="0 0 120 120" className="size-full" aria-hidden="true">
          <defs>
            <linearGradient id="orbit-heart" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="oklch(0.62 0.2 300)" />
              <stop offset="100%" stopColor="var(--brand)" />
            </linearGradient>
          </defs>
          <circle cx="60" cy="60" r="46" fill="var(--card)" />
          <circle cx="60" cy="60" r="46" fill="none" strokeWidth="6" className="stroke-muted" />
          <circle
            cx="60"
            cy="60"
            r="46"
            fill="none"
            strokeWidth="6"
            strokeLinecap="round"
            className="orbit-ring stroke-brand"
            strokeDasharray={`${RING * filled} ${RING}`}
            transform="rotate(-90 60 60)"
          />
          <path className="orbit-beat" fill="url(#orbit-heart)" d="M60 86C47 76 34 66 34 52a13 13 0 0 1 26-5 13 13 0 0 1 26 5c0 14-13 24-26 34Z" />
          <polyline className="orbit-ecg" points="36,58 48,58 53,48 59,70 65,42 70,58 84,58" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
    </div>
  );
}
