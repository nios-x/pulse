"use client";

import Link from "next/link";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { ArrowRight, Check, Flag, Lock, RotateCcw, Trophy } from "lucide-react";
import { JOURNEY_ICON } from "@/components/game/journey-icons";
import { burst, buzz, celebrate, floatLabel, pop } from "@/components/game/rewards";
import { buttonVariants } from "@/components/ui/button";
import { formatDay } from "@/lib/dates";
import { position, type Journey, type JourneyKey } from "@/lib/journeys";
import { cn } from "@/lib/utils";
import "./journeys.css";

const reduced = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const reachedCount = (j: Journey) => j.milestones.filter((m) => j.value >= m.at).length;
/** Where a stop is first selected: the next one to reach, or the summit once everything's done. */
const defaultStop = (j: Journey) => Math.min(reachedCount(j), j.milestones.length - 1);

/* ---------- Road geometry ---------- */

type Pt = { x: number; y: number };
type Sample = Pt & { s: number };
type Road = { d: string; stops: Pt[]; samples: Sample[][]; at: number[]; total: number; height: number; wide: boolean };

function bezier(a: Pt, c1: Pt, c2: Pt, b: Pt, t: number): Pt {
  const u = 1 - t;
  return {
    x: u * u * u * a.x + 3 * u * u * t * c1.x + 3 * u * t * t * c2.x + t * t * t * b.x,
    y: u * u * u * a.y + 3 * u * u * t * c1.y + 3 * u * t * t * c2.y + t * t * t * b.y,
  };
}

/** A winding road through `n` stops: left to right on wide screens, climbing bottom to top on phones. */
function layout(n: number, width: number): Road {
  const wide = width >= 640;
  let stops: Pt[];
  let height: number;
  if (wide) {
    height = 276;
    const pad = 64;
    const step = (width - pad * 2) / (n - 1);
    stops = Array.from({ length: n }, (_, i) => ({ x: pad + i * step, y: i % 2 ? 100 : 180 }));
  } else {
    const gap = 92;
    const pad = 52;
    height = pad * 2 + gap * (n - 1);
    const right = Math.min(width * 0.42, 150);
    stops = Array.from({ length: n }, (_, i) => ({ x: i % 2 ? right : 40, y: height - pad - i * gap }));
  }
  let d = `M${stops[0].x},${stops[0].y}`;
  const samples: Sample[][] = [];
  const at = [0];
  let total = 0;
  for (let i = 1; i < n; i++) {
    const a = stops[i - 1];
    const b = stops[i];
    const c1 = wide ? { x: (a.x + b.x) / 2, y: a.y } : { x: a.x, y: (a.y + b.y) / 2 };
    const c2 = wide ? { x: (a.x + b.x) / 2, y: b.y } : { x: b.x, y: (a.y + b.y) / 2 };
    d += ` C${c1.x},${c1.y} ${c2.x},${c2.y} ${b.x},${b.y}`;
    const seg: Sample[] = [{ ...a, s: total }];
    for (let k = 1; k <= 32; k++) {
      const p = bezier(a, c1, c2, b, k / 32);
      const prev = seg[seg.length - 1];
      total += Math.hypot(p.x - prev.x, p.y - prev.y);
      seg.push({ ...p, s: total });
    }
    samples.push(seg);
    at.push(total);
  }
  return { d, stops, samples, at, total, height, wide };
}

/** The point `t` stops along the road (2.5 = halfway between the third and fourth stop), by distance travelled. */
function pointAt(road: Road, t: number): Sample {
  const seg = Math.max(0, Math.min(Math.floor(t), road.samples.length - 1));
  const target = road.at[seg] + (t - seg) * (road.at[seg + 1] - road.at[seg]);
  const pts = road.samples[seg];
  for (let k = 1; k < pts.length; k++) {
    if (pts[k].s >= target) {
      const f = (target - pts[k - 1].s) / Math.max(1e-6, pts[k].s - pts[k - 1].s);
      return { x: pts[k - 1].x + (pts[k].x - pts[k - 1].x) * f, y: pts[k - 1].y + (pts[k].y - pts[k - 1].y) * f, s: target };
    }
  }
  return pts[pts.length - 1];
}

const easeInOut = (k: number) => (k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2);

/* ---------- The road ---------- */

function JourneyRoad({ journey, run, selected, onSelect, onFinish }: { journey: Journey; run: number; selected: number; onSelect: (i: number, el: HTMLElement) => void; onFinish: () => void }) {
  const box = useRef<HTMLDivElement>(null);
  const travelled = useRef<SVGPathElement>(null);
  const marker = useRef<HTMLDivElement>(null);
  const stopEls = useRef<(HTMLButtonElement | null)[]>([]);
  const [width, setWidth] = useState(0);
  const [lit, setLit] = useState(0);
  const [done, setDone] = useState(false);

  useLayoutEffect(() => {
    const el = box.current!;
    setWidth(Math.round(el.getBoundingClientRect().width));
    const ro = new ResizeObserver(([e]) => setWidth(Math.round(e.contentRect.width)));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const n = journey.milestones.length;
  const road = useMemo(() => (width ? layout(n, width) : null), [n, width]);
  const target = position(journey.milestones, journey.value);
  const reached = reachedCount(journey);

  // The animation reads the latest geometry through refs, so a resize mid-way doesn't restart it.
  const roadRef = useRef(road);
  const tRef = useRef(0);
  const finish = useRef(onFinish);
  useLayoutEffect(() => {
    roadRef.current = road;
    finish.current = onFinish;
  });

  const place = (t: number) => {
    const r = roadRef.current;
    tRef.current = t;
    if (!r || !travelled.current || !marker.current) return;
    const p = pointAt(r, t);
    travelled.current.style.strokeDasharray = `${p.s} ${r.total + 1}`;
    marker.current.style.transform = `translate(${p.x}px, ${p.y}px)`;
  };

  useLayoutEffect(() => place(tRef.current), [road]);

  const ready = road !== null;
  useEffect(() => {
    if (!ready) return;
    const instant = reduced();
    place(instant ? target : 0);
    let shown = -1;
    let raf = 0;
    const start = performance.now() + 250;
    const duration = Math.min(2800, 700 + target * 330);
    const tick = (now: number) => {
      if (shown < 0) {
        shown = 0;
        setDone(false);
        setLit(0);
      }
      const k = instant ? 1 : Math.max(0, Math.min(1, (now - start) / duration));
      const t = target * easeInOut(k);
      place(t);
      const passed = Math.min(reached - 1, Math.floor(t + 1e-6));
      while (shown < passed) {
        shown++;
        setLit(shown);
        if (instant) continue;
        const el = stopEls.current[shown];
        pop(el, 0.7);
        burst(el, { kind: shown === n - 1 ? "stars" : "sparkle", count: shown === n - 1 ? 22 : 8, spread: shown === n - 1 ? 110 : 42 });
      }
      if (k < 1) raf = requestAnimationFrame(tick);
      else {
        setDone(true);
        finish.current();
      }
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // `target`/`reached` change only with the journey, which also bumps `run`.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [run, ready]);

  // When you're standing exactly on a stop, the stop wears the "you are here" ring instead of the marker.
  const onStop = Math.abs(target - Math.round(target)) < 0.02;
  const hereIndex = onStop ? Math.round(target) : -1;

  return (
    <div ref={box} className="relative w-full" style={{ height: road?.height ?? 276 }} role="group" aria-label={`${journey.title} road, ${reached - 1} of ${n - 1} milestones reached`}>
      {road && (
        <>
          <svg width={width} height={road.height} className="absolute inset-0" aria-hidden="true">
            <path d={road.d} fill="none" strokeLinecap="round" strokeWidth={14} className="stroke-muted" />
            <path d={road.d} fill="none" strokeLinecap="round" strokeWidth={2} strokeDasharray="1 11" className="stroke-border-strong" />
            <path ref={travelled} d={road.d} fill="none" strokeLinecap="round" strokeWidth={14} className="stroke-brand" style={{ strokeDasharray: `0 ${road.total + 1}` }} />
          </svg>

          <ol className="absolute inset-0">
            {journey.milestones.map((m, i) => {
              const isLit = i <= lit;
              const isNext = done && i === reached && i < n;
              const isLast = i === n - 1;
              const isHere = done && i === hereIndex;
              const p = road.stops[i];
              const Icon = isLit ? (i === 0 ? Flag : isLast ? Trophy : Check) : isLast ? Trophy : isNext ? JOURNEY_ICON[journey.key] : Lock;
              const sub = isLit ? (m.reachedOn ? formatDay(m.reachedOn) : i === 0 ? "Start" : "Reached") : isNext && journey.toGo ? `${journey.toGo} to go` : null;
              const above = road.wide && i % 2 === 1;
              return (
                <li key={`${journey.key}-${m.at}`}>
                  <button
                    ref={(el) => {
                      stopEls.current[i] = el;
                    }}
                    type="button"
                    onClick={(e) => onSelect(i, e.currentTarget)}
                    aria-pressed={selected === i}
                    aria-label={`${m.label}: ${i <= reached - 1 ? (m.reachedOn ? `reached ${formatDay(m.reachedOn)}` : "reached") : i === reached ? `next stop, ${journey.toGo} to go` : "not reached yet"}`}
                    className={cn(
                      "absolute z-10 flex size-11 -translate-x-1/2 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full transition-[background-color,color,box-shadow,border-color] duration-200",
                      isLit
                        ? "journey-lit bg-brand text-brand-foreground shadow-brand"
                        : isNext
                          ? "journey-next border-2 border-dashed border-brand bg-card text-brand"
                          : "border border-border-strong bg-card text-muted-foreground hover:border-brand/50 hover:text-foreground",
                      isLast && !isLit && "size-12",
                      selected === i && "ring-4 ring-brand/25",
                      isHere && "ring-4 ring-primary/45",
                    )}
                    style={{ left: p.x, top: p.y }}
                  >
                    <Icon className={isLit || isNext || isLast ? "size-5" : "size-4"} strokeWidth={isLit ? 2.5 : 2} aria-hidden="true" />
                  </button>
                  <div
                    aria-hidden="true"
                    className={cn("pointer-events-none absolute leading-tight", road.wide ? "w-36 text-center" : "text-left")}
                    style={
                      road.wide
                        ? { left: p.x, top: p.y, transform: above ? "translate(-50%, calc(-100% - 32px))" : "translate(-50%, 32px)" }
                        : { left: p.x + 32, top: p.y, transform: "translateY(-50%)", maxWidth: width - p.x - 40 }
                    }
                  >
                    <span className={cn("block text-sm font-semibold transition-colors duration-200", isLit || isNext ? "text-foreground" : "text-muted-foreground")}>{m.label}</span>
                    {sub && <span className={cn("block text-xs", isNext ? "font-medium text-brand" : "text-muted-foreground")}>{sub}</span>}
                  </div>
                </li>
              );
            })}
          </ol>

          <div ref={marker} className="pointer-events-none absolute top-0 left-0 z-20" style={{ transform: "translate(-100px, -100px)" }} aria-hidden="true">
            <div className={cn("-translate-x-1/2 -translate-y-1/2 transition-opacity duration-200", done && onStop && "opacity-0")}>
              <span className="journey-you absolute bottom-[calc(100%+6px)] left-1/2 -translate-x-1/2 rounded-full bg-primary px-2 py-0.5 font-heading text-xs font-bold whitespace-nowrap text-primary-foreground shadow-go">
                You
              </span>
              <span className="block size-5 rounded-full border-[3px] border-card bg-primary shadow-go" />
            </div>
          </div>
        </>
      )}
    </div>
  );
}

/* ---------- Picker, detail and celebration ---------- */

function Ring({ value, className }: { value: number; className?: string }) {
  const r = 15;
  const c = 2 * Math.PI * r;
  return (
    <svg viewBox="0 0 36 36" className={cn("size-9 -rotate-90", className)} aria-hidden="true">
      <circle cx="18" cy="18" r={r} fill="none" strokeWidth="3.5" className="stroke-muted" />
      <circle cx="18" cy="18" r={r} fill="none" strokeWidth="3.5" strokeLinecap="round" className="stroke-brand transition-[stroke-dasharray] duration-700 ease-(--ease-out-soft)" strokeDasharray={`${c * value} ${c}`} />
    </svg>
  );
}

type Stored = Partial<Record<JourneyKey, number>>;

export function JourneyExplorer({ journeys, memberId, memberQuery, isSelf }: { journeys: Journey[]; memberId: string; memberQuery: string; isSelf: boolean }) {
  const [active, setActive] = useState<JourneyKey>("level");
  const [run, setRun] = useState(1);
  const [selected, setSelected] = useState(() => defaultStop(journeys.find((j) => j.key === "level") ?? journeys[0]));
  const checked = useRef(false);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const journey = journeys.find((j) => j.key === active) ?? journeys[0];

  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  const choose = (j: Journey, stop = defaultStop(j)) => {
    setActive(j.key);
    setSelected(stop);
    setRun((r) => r + 1);
  };

  // Once the first road has drawn, compare with what this browser saw last time. New milestones get
  // a celebration, then the page moves to the road where the newest one is and draws it.
  const onFinish = () => {
    if (checked.current) return;
    checked.current = true;
    const key = `pulse:journeys:v1:${memberId}`;
    let seen: Stored | null = null;
    try {
      seen = JSON.parse(localStorage.getItem(key) ?? "null");
    } catch {}
    const now: Stored = Object.fromEntries(journeys.map((j) => [j.key, reachedCount(j) - 1]));
    try {
      localStorage.setItem(key, JSON.stringify(now));
    } catch {}
    const later = (fn: () => void, ms: number) => timers.current.push(setTimeout(fn, ms));
    const total = Object.values(now).reduce((s, v) => s + (v ?? 0), 0);
    if (!seen) {
      if (total > 0) later(() => celebrate({ title: `${total} milestone${total === 1 ? "" : "s"} reached`, message: "Every one of them came from something actually logged. Here's the road so far." }), 250);
      return;
    }
    const fresh = journeys.flatMap((j) => j.milestones.slice((seen[j.key] ?? 0) + 1, (now[j.key] ?? 0) + 1).map((m) => ({ j, m })));
    if (!fresh.length) return;
    const newest = [...fresh].sort((a, b) => (b.m.reachedOn ?? "").localeCompare(a.m.reachedOn ?? ""))[0];
    later(
      () =>
        celebrate(
          fresh.length === 1
            ? { title: `New milestone: ${newest.m.label}`, message: `On the ${newest.j.title.toLowerCase()} road. That's a real win.` }
            : { title: `${fresh.length} new milestones`, message: fresh.map((f) => f.m.label).slice(0, 4).join(" · ") },
        ),
      250,
    );
    later(() => choose(newest.j, newest.j.milestones.indexOf(newest.m)), 3300);
  };

  const onSelect = (i: number, el: HTMLElement) => {
    setSelected(i);
    const m = journey.milestones[i];
    if (journey.value >= m.at && i > 0) {
      pop(el, 0.8);
      floatLabel(el, "Reached", "soft");
      buzz();
    } else pop(el, 0.4);
  };

  const reached = reachedCount(journey);
  const m = journey.milestones[selected] ?? journey.milestones[0];
  const isReached = journey.value >= m.at;
  const prev = journey.milestones[selected - 1];
  const legPct = !isReached && prev ? Math.max(0, Math.min(100, Math.round(((journey.value - prev.at) / (m.at - prev.at)) * 100))) : 0;
  const isNext = selected === reached;
  const Icon = JOURNEY_ICON[journey.key];
  const href = `${journey.key === "meds" ? "/medications" : "/progress"}${memberQuery}`;

  return (
    <div className="flex flex-col gap-6">
      <div role="radiogroup" aria-label="Choose a journey" className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {journeys.map((j, i) => {
          const JIcon = JOURNEY_ICON[j.key];
          const count = reachedCount(j) - 1;
          const stops = j.milestones.length - 1;
          const t = position(j.milestones, j.value);
          const leg = count >= stops ? 1 : t - Math.floor(t);
          const on = j.key === active;
          return (
            <button
              key={j.key}
              type="button"
              role="radio"
              aria-checked={on}
              onClick={() => {
                timers.current.forEach(clearTimeout);
                if (!on) choose(j);
              }}
              className={cn(
                "reward-rise group flex cursor-pointer items-center gap-3 rounded-2xl border p-3 text-left transition-[background-color,border-color,box-shadow,transform] duration-200 ease-(--ease-out-soft) hover:-translate-y-0.5 active:translate-y-0 sm:p-3.5",
                on ? "border-brand bg-brand-soft shadow-soft" : "border-border bg-card hover:border-brand/40 hover:shadow-soft",
              )}
              style={{ animationDelay: `${i * 40}ms` }}
            >
              <span className="relative flex size-9 shrink-0 items-center justify-center">
                <Ring value={leg} className="absolute inset-0" />
                <JIcon className={cn("size-4", on ? "text-brand" : "text-muted-foreground group-hover:text-foreground")} aria-hidden="true" />
              </span>
              <span className="min-w-0">
                <span className="block truncate text-[0.9375rem] font-semibold">{j.title}</span>
                <span className="block text-sm text-muted-foreground tabular">
                  {count >= stops ? (
                    <span className="inline-flex items-center gap-1 font-medium text-brand"><Trophy className="size-3.5" aria-hidden="true" /> Complete</span>
                  ) : (
                    `${count} of ${stops} stops`
                  )}
                </span>
              </span>
            </button>
          );
        })}
      </div>

      <section aria-labelledby="road-heading" className="overflow-hidden rounded-2xl border border-border bg-card">
        <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-3 p-5 pb-0 sm:p-6 sm:pb-0">
          <div className="flex min-w-0 items-center gap-3.5">
            <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-brand">
              <Icon className="size-5" aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <h2 id="road-heading" className="font-heading text-xl font-semibold">{journey.title} road</h2>
              <p className="text-[0.9375rem] text-muted-foreground">{journey.how}</p>
            </div>
          </div>
          <div className="flex w-full items-center justify-between gap-4 sm:w-auto">
            <div className="sm:text-right">
              <p className="font-heading text-2xl font-bold tabular">{journey.valueLabel}</p>
              <p className="text-sm text-muted-foreground">{journey.note ?? "So far"}</p>
            </div>
            <button type="button" onClick={() => setRun((r) => r + 1)} aria-label="Replay this road" title="Replay" className="flex size-10 shrink-0 cursor-pointer items-center justify-center rounded-full border border-border text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
              <RotateCcw className="size-4" aria-hidden="true" />
            </button>
          </div>
        </div>

        <div className="px-3 pt-4 pb-2 sm:px-4">
          <JourneyRoad journey={journey} run={run} selected={selected} onSelect={onSelect} onFinish={onFinish} />
        </div>

        <div aria-live="polite" className="m-3 mt-0 flex flex-col gap-4 rounded-xl bg-surface p-4 sm:m-4 sm:mt-0 sm:flex-row sm:items-center sm:justify-between sm:p-5">
          <div className="flex min-w-0 items-center gap-3.5">
            <span className={cn("flex size-11 shrink-0 items-center justify-center rounded-full", isReached ? "bg-brand text-brand-foreground" : isNext ? "border-2 border-dashed border-brand text-brand" : "border border-border-strong text-muted-foreground")}>
              {isReached ? <Check className="size-5" strokeWidth={2.5} aria-hidden="true" /> : isNext ? <Icon className="size-5" aria-hidden="true" /> : <Lock className="size-4" aria-hidden="true" />}
            </span>
            <div className="min-w-0 flex-1">
              <p className="font-heading text-lg font-semibold">{m.label}</p>
              <p className="text-[0.9375rem] text-muted-foreground">
                {isReached
                  ? selected === 0
                    ? "Where the road began."
                    : `Reached${m.reachedOn ? ` on ${formatDay(m.reachedOn)}` : ""}. ${selected === journey.milestones.length - 1 ? "The whole road, done." : "That one's yours to keep."}`
                  : isNext
                    ? `${journey.toGo} to go. ${legPct >= 50 ? "More than halfway there." : "Every bit counts."}`
                    : `${selected - reached + 1} stops ahead. One step at a time.`}
              </p>
              {isNext && (
                <div className="mt-2 h-1.5 max-w-xs overflow-hidden rounded-full bg-muted" role="progressbar" aria-label={`Progress to ${m.label}`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={legPct}>
                  <div className="reward-sheen h-full rounded-full bg-brand transition-[width] duration-700 ease-(--ease-out-soft)" style={{ width: `${legPct}%` }} />
                </div>
              )}
            </div>
          </div>
          {!isReached && journey.key !== "streak" && journey.key !== "level" ? (
            <Link href={href} className={cn(buttonVariants(), "shrink-0")}>
              {isSelf ? "Keep going" : "Log for them"} <ArrowRight aria-hidden="true" />
            </Link>
          ) : !isReached ? (
            <Link href={href} className={cn(buttonVariants(), "shrink-0")}>
              Today&apos;s quests <ArrowRight aria-hidden="true" />
            </Link>
          ) : null}
        </div>
      </section>
    </div>
  );
}
