"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { ArrowRight, CalendarHeart, Flower2, Heart, Sparkles, Users } from "lucide-react";
import { LogoMark } from "@/components/brand/logo";
import { cn } from "@/lib/utils";
import "./pcos-intro.css";

/** How long the welcome stays before it folds away, and how long the fold and petals take. */
const HOLD_MS = 2000;
const FOLD_MS = 2000;

const highlights = [
  { icon: CalendarHeart, label: "Cycle & symptom tracking" },
  { icon: Sparkles, label: "Gentle, science-backed guidance" },
  { icon: Users, label: "A community that gets it" },
];

/** Pulse violet and lilac with a touch of rose, and a leaf-green petal now and then. */
const PETAL_TONES = ["var(--brand)", "var(--bloom-rose)", "var(--chart-4)", "var(--bloom-rose)", "var(--primary)"];

/** Petals released from the bud: fanned all the way round, then drifting down as they fall. Fixed values so every visit feels the same. */
const PETALS = Array.from({ length: 18 }, (_, i) => {
  const angle = ((i * 20 + ((i * 47) % 13)) * Math.PI) / 180;
  const reach = 26 + ((i * 37) % 26);
  const turn = (i % 2 ? 1 : -1) * (160 + ((i * 53) % 160));
  return {
    size: 20 + ((i * 29) % 16),
    tone: PETAL_TONES[i % PETAL_TONES.length],
    style: {
      "--dx": `${(Math.cos(angle) * reach).toFixed(1)}vmin`,
      "--dy": `calc(${(Math.sin(angle) * reach * 0.6).toFixed(1)}vmin + ${18 + ((i * 13) % 20)}vh)`,
      "--r0": `${(i * 41) % 360}deg`,
      "--r1": `${((i * 41) % 360) + turn}deg`,
      "--delay": `${360 + ((i * 17) % 200)}ms`,
      "--dur": `${1150 + ((i * 31) % 300)}ms`,
    } as React.CSSProperties,
  };
});

/**
 * The welcome shown each time PCOS care is opened: a Pulse-themed hero for two seconds,
 * then the page gently folds into a flower bud that lets its petals go, revealing PCOS care.
 * Purely decorative (hidden from screen readers); a tap or Escape skips it.
 */
export function PcosIntro() {
  const [phase, setPhase] = useState<"open" | "folding" | "gone">("open");

  useEffect(() => {
    if (phase === "gone") return;
    const t = setTimeout(() => setPhase(phase === "open" ? "folding" : "gone"), phase === "open" ? HOLD_MS : FOLD_MS);
    return () => clearTimeout(t);
  }, [phase]);

  useEffect(() => {
    if (phase !== "open") return;
    const root = document.documentElement;
    const previous = root.style.overflow;
    root.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setPhase("folding");
    window.addEventListener("keydown", onKey);
    return () => {
      root.style.overflow = previous;
      window.removeEventListener("keydown", onKey);
    };
  }, [phase]);

  if (phase === "gone") return null;
  const folding = phase === "folding";

  return (
    <div aria-hidden="true" className={cn("bloom fixed inset-0 z-100 select-none", folding && "pointer-events-none")} onClick={() => setPhase("folding")}>
      <div className={cn("absolute inset-0 isolate overflow-hidden bg-background text-foreground", folding && "bloom-fold")}>
        <div className="pointer-events-none absolute inset-0 -z-10">
          <div className="absolute -top-32 -left-24 size-112 rounded-full bg-(--bloom-rose)/25 blur-3xl" />
          <div className="absolute top-1/3 -right-32 size-128 rounded-full bg-brand-soft blur-3xl" />
          <div className="absolute bottom-0 left-1/3 size-72 rounded-full bg-primary-soft/70 blur-3xl" />
        </div>

        <div className="mx-auto flex h-full max-w-6xl flex-col px-6 md:px-10">
          <div className="bloom-rise flex items-center gap-2.5 py-5">
            <LogoMark />
            <span className="flex flex-col leading-none">
              <span className="font-heading text-lg font-extrabold tracking-tight">Pulse</span>
              <span className="mt-1 text-xs font-medium text-muted-foreground">PCOS care</span>
            </span>
          </div>

          <div className="grid flex-1 content-center items-center gap-8 pb-10 lg:grid-cols-[1.1fr_1fr] lg:gap-16">
            <div className="flex flex-col items-start gap-5 lg:gap-6">
              <span className="bloom-rise inline-flex items-center gap-2 rounded-full bg-brand-soft px-3.5 py-1.5 text-sm font-semibold text-brand" style={{ animationDelay: "80ms" }}>
                <Heart className="size-3.5 fill-current" />
                Made for girls with PCOS
              </span>

              <h2 className="bloom-rise text-4xl leading-[1.08] font-extrabold sm:text-5xl lg:text-6xl" style={{ animationDelay: "160ms" }}>
                Your body isn&apos;t broken. <span className="text-brand">It&apos;s blooming.</span>
              </h2>

              <p className="bloom-rise max-w-xl text-lg text-muted-foreground" style={{ animationDelay: "260ms" }}>
                PCOS can feel confusing, lonely, and loud. This is a soft place to understand your cycle, make sense of your symptoms, and feel at home in your body again, one gentle day at a time.
              </p>

              <div className="bloom-rise hidden flex-wrap items-center gap-3 sm:flex" style={{ animationDelay: "340ms" }}>
                <span className="inline-flex h-12 items-center gap-2 rounded-xl bg-primary px-6 text-base font-semibold text-primary-foreground shadow-go">
                  Start your journey <ArrowRight className="size-4" />
                </span>
                <span className="inline-flex h-12 items-center rounded-xl border border-border bg-card px-6 text-base font-semibold">What is PCOS?</span>
              </div>

              <ul className="bloom-rise mt-1 hidden flex-wrap gap-x-6 gap-y-3 md:flex" style={{ animationDelay: "420ms" }}>
                {highlights.map(({ icon: Icon, label }) => (
                  <li key={label} className="flex items-center gap-2 text-sm text-muted-foreground">
                    <span className="flex size-7 items-center justify-center rounded-lg bg-brand-soft text-brand">
                      <Icon className="size-3.5" />
                    </span>
                    {label}
                  </li>
                ))}
              </ul>

              <div className="bloom-rise mt-2 hidden items-center gap-4 lg:flex" style={{ animationDelay: "500ms" }}>
                <div className="flex -space-x-3">
                  {["bg-avatar-4", "bg-avatar-6", "bg-avatar-5", "bg-brand"].map((c) => (
                    <span key={c} className={cn("size-10 rounded-full border-2 border-background", c)} />
                  ))}
                </div>
                <p className="text-sm text-muted-foreground">
                  <span className="font-semibold text-foreground">12,000+</span> girls already feel less alone
                </p>
              </div>
            </div>

            <div className="bloom-rise relative mx-auto w-full max-w-60 sm:max-w-xs lg:max-w-md" style={{ animationDelay: "220ms" }}>
              <div className="bloom-float overflow-hidden rounded-3xl border-4 border-card bg-brand-soft shadow-pop">
                <Image src="/images/pcos/hero-illustration.png" alt="" width={800} height={800} loading="eager" fetchPriority="high" className="aspect-square h-auto w-full object-cover" />
              </div>

              <div className="bloom-float-late absolute -bottom-6 -left-4 hidden items-center gap-3 rounded-2xl border border-border bg-card/95 p-4 shadow-pop backdrop-blur sm:flex md:-left-10">
                <span className="flex size-11 items-center justify-center rounded-xl bg-brand-soft text-brand">
                  <CalendarHeart className="size-5" />
                </span>
                <div>
                  <p className="text-sm text-muted-foreground">Today&apos;s check-in</p>
                  <p className="font-heading text-[0.9375rem] font-bold">Feeling calm, day 14</p>
                </div>
              </div>

              <div className="absolute -top-5 -right-3 hidden rounded-2xl border border-border bg-card/95 px-4 py-3 shadow-pop backdrop-blur sm:block md:-right-8">
                <p className="text-sm text-muted-foreground">Cycle insight</p>
                <p className="font-heading text-[0.9375rem] font-bold text-brand">Your energy peaks soon</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {folding && (
        <>
          <span className="bloom-bud absolute top-1/2 left-1/2 flex size-20 items-center justify-center rounded-full bg-brand text-brand-foreground shadow-brand">
            <Flower2 className="size-10" strokeWidth={1.75} />
          </span>
          {PETALS.map((p, i) => (
            <svg key={i} viewBox="0 0 24 24" width={p.size} height={p.size} className="bloom-petal" style={p.style}>
              <path d="M12 1.5C17.5 6.5 18.5 14 12 22.5 5.5 14 6.5 6.5 12 1.5Z" fill={p.tone} />
              <path d="M12 5v13" stroke="var(--background)" strokeOpacity="0.45" strokeWidth="0.8" strokeLinecap="round" />
            </svg>
          ))}
        </>
      )}
    </div>
  );
}
