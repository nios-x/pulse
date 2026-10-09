"use client";

import Link from "next/link";
import { useOptimistic, useTransition } from "react";
import { Check, ChevronRight, Minus, Plus } from "lucide-react";
import { toast } from "sonner";
import { logHabit } from "@/app/actions/habits";
import { celebrate } from "@/components/game/confetti";
import { Fruit } from "@/components/fruits/fruit";
import { VitalDialog } from "@/components/health/vital-dialog";
import { useAccess } from "@/components/providers/access-provider";
import type { HabitKind } from "@/db/schema";
import { QUESTS, type QuestKey } from "@/lib/gamification";
import { cn } from "@/lib/utils";

const STEP: Record<HabitKind, number> = { water: 1, walk: 10, sleep: 0.5, produce: 1, mindful: 5 };
const MAX: Record<HabitKind, number> = { water: 20, walk: 300, sleep: 14, produce: 15, mindful: 120 };
const TINT: Record<QuestKey, string> = {
  meds: "bg-fruit-orange-soft",
  vital: "bg-fruit-berry-soft",
  water: "bg-fruit-water-soft",
  walk: "bg-fruit-leaf-soft",
  produce: "bg-fruit-grape-soft",
  sleep: "bg-fruit-lemon-soft",
};

export function QuestList({
  member,
  done,
  available,
  habits,
  doses,
  compact = false,
}: {
  member: { id: string; name: string };
  done: QuestKey[];
  available: QuestKey[];
  habits: Partial<Record<HabitKind, number>>;
  doses: { taken: number; due: number };
  compact?: boolean;
}) {
  const { can } = useAccess();
  const canLog = can("vitals.log", member.id);
  const [pending, start] = useTransition();
  const [values, setValue] = useOptimistic(habits, (cur, p: { kind: HabitKind; value: number }) => ({ ...cur, [p.kind]: p.value }));

  const change = (kind: HabitKind, next: number, el?: HTMLElement) =>
    start(async () => {
      setValue({ kind, value: next });
      const res = await logHabit({ memberId: member.id, kind, value: next });
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      if (res.data?.questDone) {
        const r = el?.getBoundingClientRect();
        celebrate(r ? { x: r.left + r.width / 2, y: r.top } : undefined);
        toast.success(res.message, { description: res.data.leveledUp ? `Level up! You're now a ${res.data.level}.` : `Streak: ${res.data.streak} day${res.data.streak === 1 ? "" : "s"}` });
      }
    });

  const quests = QUESTS.filter((q) => available.includes(q.key));

  return (
    <ul className={cn("grid gap-2.5", !compact && "sm:grid-cols-2")}>
      {quests.map((q) => {
        const isDone = done.includes(q.key);
        const habit = q.habit;
        const value = habit ? values[habit] ?? 0 : q.key === "meds" ? doses.taken : isDone ? 1 : 0;
        const goal = q.key === "meds" ? doses.due : q.goal;
        const pct = Math.min(100, Math.round((value / Math.max(1, goal)) * 100));
        return (
          <li key={q.key} className={cn("relative flex items-center gap-3 overflow-hidden rounded-2xl border p-3 transition-colors duration-200", isDone ? "border-success-border bg-success-soft/60" : "border-border bg-card")}>
            <span className={cn("relative flex size-12 shrink-0 items-center justify-center rounded-xl", TINT[q.key])}>
              <Fruit kind={q.fruit} className={cn("size-9 transition-transform duration-300", isDone && "motion-safe:animate-pop")} />
              {isDone && (
                <span className="absolute -right-1 -bottom-1 flex size-5 items-center justify-center rounded-full bg-success text-card ring-2 ring-card">
                  <Check className="size-3" strokeWidth={3.5} aria-hidden="true" />
                </span>
              )}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[0.9375rem] font-semibold">{q.title}</p>
              <div className="mt-1 flex items-center gap-2">
                <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted" aria-hidden="true">
                  <div className={cn("h-full rounded-full transition-[width] duration-300", isDone ? "bg-success" : "bg-fruit-orange")} style={{ width: `${pct}%` }} />
                </div>
                <span className="shrink-0 text-xs font-medium text-muted-foreground tabular">
                  {q.key === "vital" ? (isDone ? "Done" : "0/1") : `${value}/${goal}${q.unit ? ` ${q.unit}` : ""}`}
                </span>
              </div>
              <p className="sr-only">{isDone ? "Quest complete." : "Not done yet."} Worth {q.xp} XP.</p>
            </div>
            {habit ? (
              <div className="flex shrink-0 items-center gap-1">
                <button
                  type="button"
                  aria-label={`Less ${q.short.toLowerCase()}`}
                  disabled={!canLog || pending || value <= 0}
                  onClick={(e) => change(habit, Math.max(0, value - STEP[habit]), e.currentTarget)}
                  className="flex size-10 cursor-pointer items-center justify-center rounded-full border border-border-strong text-muted-foreground transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <Minus className="size-4" aria-hidden="true" />
                </button>
                <button
                  type="button"
                  aria-label={`More ${q.short.toLowerCase()}`}
                  disabled={!canLog || pending || value >= MAX[habit]}
                  onClick={(e) => change(habit, value + STEP[habit], e.currentTarget)}
                  className="flex size-10 cursor-pointer items-center justify-center rounded-full bg-primary text-primary-foreground shadow-go transition-transform hover:bg-primary-strong active:scale-95 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <Plus className="size-4" strokeWidth={3} aria-hidden="true" />
                </button>
              </div>
            ) : q.key === "meds" ? (
              <Link href={`/medications?member=${member.id}`} aria-label="Go to today's medicines" className="flex size-10 shrink-0 items-center justify-center rounded-full border border-border-strong hover:bg-muted">
                <ChevronRight className="size-5" aria-hidden="true" />
              </Link>
            ) : !isDone && canLog ? (
              <VitalDialog
                members={[member]}
                defaultMemberId={member.id}
                trigger={
                  <button type="button" aria-label="Record a reading" className="flex size-10 shrink-0 cursor-pointer items-center justify-center rounded-full bg-primary text-primary-foreground shadow-go">
                    <Plus className="size-4" strokeWidth={3} aria-hidden="true" />
                  </button>
                }
              />
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}
