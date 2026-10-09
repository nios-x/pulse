"use client";

import { useEffect, useRef, useState } from "react";
import { Moon } from "lucide-react";
import "./rewards.css";

/*
 * Small, kind rewards for finishing a step: a pop, a burst of petals, a rising "+5 XP" chip,
 * and a full-screen bloom for the bigger moments. All of it is skipped under reduced motion,
 * and every celebration is also announced to screen readers.
 */

const ROSE = "oklch(0.78 0.11 345)";
const TONES = {
  petals: ["var(--brand)", ROSE, "var(--chart-4)", ROSE, "var(--primary)"],
  sparkle: ["var(--brand)", "var(--chart-4)", ROSE],
  stars: ["var(--brand)", "var(--chart-3)", "var(--chart-4)"],
};
const SHAPES = {
  petals: "M12 1.5C17.5 6.5 18.5 14 12 22.5 5.5 14 6.5 6.5 12 1.5Z",
  sparkle: "M12 1l2.6 8.4L23 12l-8.4 2.6L12 23l-2.6-8.4L1 12l8.4-2.6Z",
  stars: "M12 2l2.9 6.6 7.1.6-5.4 4.7 1.6 7L12 17.2 5.8 20.9l1.6-7L2 9.2l7.1-.6Z",
};
type Kind = keyof typeof SHAPES;

const reduced = () => typeof window === "undefined" || window.matchMedia("(prefers-reduced-motion: reduce)").matches;

function centre(from: Element) {
  const r = from.getBoundingClientRect();
  return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
}

function layer(x: number, y: number) {
  const el = document.createElement("div");
  el.setAttribute("aria-hidden", "true");
  el.style.cssText = `position:fixed;left:${x}px;top:${y}px;width:0;height:0;pointer-events:none;z-index:120;`;
  document.body.append(el);
  return el;
}

/** Petals (or sparkles, or stars) fanning out from an element and drifting down. */
export function burst(from: Element | null | undefined, { kind = "petals", count = 12, spread = 70 }: { kind?: Kind; count?: number; spread?: number } = {}) {
  if (!from || reduced()) return;
  const { x, y } = centre(from);
  const host = layer(x, y);
  const tones = TONES[kind];
  for (let i = 0; i < count; i++) {
    const angle = (i / count) * Math.PI * 2 + Math.random() * 0.6;
    const dist = spread * (0.55 + Math.random() * 0.6);
    const size = (kind === "petals" ? 12 : 10) + Math.random() * 10;
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("viewBox", "0 0 24 24");
    svg.setAttribute("width", String(size));
    svg.setAttribute("height", String(size));
    svg.style.cssText = `position:absolute;left:${-size / 2}px;top:${-size / 2}px;`;
    const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    path.setAttribute("d", SHAPES[kind]);
    path.setAttribute("fill", tones[i % tones.length]);
    svg.append(path);
    host.append(svg);
    const r0 = Math.random() * 360;
    const dx = Math.cos(angle) * dist;
    const dy = Math.sin(angle) * dist * 0.8 + spread * 0.35;
    svg.animate(
      [
        { transform: `translate(0,0) rotate(${r0}deg) scale(0.2)`, opacity: 0 },
        { opacity: 1, offset: 0.15 },
        { transform: `translate(${dx}px,${dy}px) rotate(${r0 + (i % 2 ? 200 : -200)}deg) scale(1)`, opacity: 0 },
      ],
      { duration: 750 + Math.random() * 450, easing: "cubic-bezier(0.2, 0.7, 0.3, 1)", fill: "forwards" },
    );
  }
  setTimeout(() => host.remove(), 1400);
}

/** A little chip ("+5 XP", "Morning done") that rises from an element and fades. */
export function floatLabel(from: Element | null | undefined, text: string, tone: "brand" | "soft" = "brand") {
  if (!from || reduced()) return;
  const { x, y } = centre(from);
  const host = layer(x, y);
  const chip = document.createElement("span");
  chip.textContent = text;
  chip.className =
    tone === "brand"
      ? "absolute -translate-x-1/2 -translate-y-1/2 whitespace-nowrap rounded-full bg-brand px-2.5 py-1 font-heading text-sm font-bold text-brand-foreground shadow-brand"
      : "absolute -translate-x-1/2 -translate-y-1/2 whitespace-nowrap rounded-full bg-brand-soft px-2.5 py-1 font-heading text-sm font-bold text-brand";
  host.append(chip);
  chip.animate(
    [
      { translate: "0 4px", scale: "0.7", opacity: 0 },
      { translate: "0 -14px", scale: "1.05", opacity: 1, offset: 0.25 },
      { translate: "0 -22px", scale: "1", opacity: 1, offset: 0.7 },
      { translate: "0 -40px", scale: "0.95", opacity: 0 },
    ],
    { duration: 1100, easing: "cubic-bezier(0.22, 1, 0.36, 1)", fill: "forwards" },
  );
  setTimeout(() => host.remove(), 1200);
}

/** A springy squeeze on the thing that was just tapped. */
export function pop(el: Element | null | undefined, strength = 1) {
  if (!el || reduced()) return;
  const s = (n: number) => 1 + (n - 1) * strength;
  el.animate([{ transform: "scale(1)" }, { transform: `scale(${s(1.2)})` }, { transform: `scale(${s(0.94)})` }, { transform: "scale(1)" }], { duration: 420, easing: "ease-out" });
}

/** A light tap on phones that support it. */
export function buzz() {
  if (!reduced()) navigator.vibrate?.(12);
}

type Celebration = { title: string; message?: string; kind?: "bloom" | "moon" };
const EVENT = "pulse:celebrate";

/** The big moment: a flower (or moon) opens on screen with a short, kind message. Needs <CelebrationHost /> mounted. */
export function celebrate(detail: Celebration) {
  window.dispatchEvent(new CustomEvent<Celebration>(EVENT, { detail }));
}

const PETAL_ANGLES = [0, 45, 90, 135, 180, 225, 270, 315];

export function CelebrationHost() {
  const [current, setCurrent] = useState<(Celebration & { id: number }) | null>(null);
  const [leaving, setLeaving] = useState(false);
  const card = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const on = (e: Event) => {
      setLeaving(false);
      setCurrent({ ...(e as CustomEvent<Celebration>).detail, id: Date.now() });
    };
    window.addEventListener(EVENT, on);
    return () => window.removeEventListener(EVENT, on);
  }, []);

  useEffect(() => {
    if (!current) return;
    const kind = current.kind === "moon" ? "stars" : "petals";
    const t0 = setTimeout(() => burst(card.current, { kind, count: 26, spread: 220 }), 260);
    const t1 = setTimeout(() => setLeaving(true), 2600);
    const t2 = setTimeout(() => setCurrent(null), 2900);
    return () => [t0, t1, t2].forEach(clearTimeout);
  }, [current]);

  const close = () => {
    setLeaving(true);
    setTimeout(() => setCurrent(null), 300);
  };

  return (
    <>
      <p className="sr-only" aria-live="polite">{current ? `${current.title}. ${current.message ?? ""}` : ""}</p>
      {current && (
        <div key={current.id} aria-hidden="true" data-leaving={leaving || undefined} onClick={close} className="reward-scrim fixed inset-0 z-110 flex items-center justify-center bg-background/50 p-6 backdrop-blur-sm">
          <div ref={card} className="reward-card relative flex w-full max-w-sm flex-col items-center gap-3 rounded-3xl border border-border bg-card px-6 pt-8 pb-7 text-center shadow-pop">
            <div className="relative flex size-28 items-center justify-center">
              <span className="reward-ring absolute inset-2 rounded-full border-2 border-brand/50" />
              <span className="reward-ring absolute inset-2 rounded-full border-2 border-brand/40" style={{ animationDelay: "500ms" }} />
              {current.kind === "moon" ? (
                <span className="reward-core flex size-20 items-center justify-center rounded-full bg-brand-soft text-brand">
                  <Moon className="size-10 fill-current" strokeWidth={1.5} />
                </span>
              ) : (
                <svg viewBox="0 0 96 96" className="size-28">
                  {PETAL_ANGLES.map((a, i) => (
                    <path key={a} className="reward-petal" style={{ "--a": `${a}deg`, "--i": i } as React.CSSProperties} d="M48 48C38 36 38 18 48 8 58 18 58 36 48 48Z" fill={i % 2 ? ROSE : "var(--brand)"} fillOpacity={i % 2 ? 0.9 : 0.85} />
                  ))}
                  <circle className="reward-core" cx="48" cy="48" r="10" fill="var(--chart-3)" />
                  <circle className="reward-core" cx="48" cy="48" r="5" fill="var(--card)" fillOpacity="0.6" />
                </svg>
              )}
            </div>
            <h2 className="reward-rise font-heading text-2xl font-extrabold" style={{ animationDelay: "380ms" }}>{current.title}</h2>
            {current.message && <p className="reward-rise text-[0.9375rem] text-muted-foreground" style={{ animationDelay: "480ms" }}>{current.message}</p>}
          </div>
        </div>
      )}
    </>
  );
}
