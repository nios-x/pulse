"use client";

import Link from "next/link";
import { useOptimistic, useTransition } from "react";
import { Check, ChevronRight, Minus, Plus } from "lucide-react";
import { toast } from "sonner";
import { logHabit } from "@/app/actions/habits";
import { QUEST_ICON } from "@/components/game/quest-icons";
import { VitalDialog } from "@/components/health/vital-dialog";
import { useAccess } from "@/components/providers/access-provider";
import type { HabitKind } from "@/db/schema";
import { QUESTS, type QuestKey } from "@/lib/gamification";
import { cn } from "@/lib/utils";

const STEP: Record<HabitKind, number> = { water: 1, walk: 10, sleep: 0.5, produce: 1, mindful: 5 };
const MAX: Record<HabitKind, number> = { water: 20, walk: 300, sleep: 14, produce: 15, mindful: 120 };
const STEP_PLUS =
  "flex size-10 shrink-0 cursor-pointer items-center justify-center rounded-full bg-primary-soft text-primary-strong transition-colors hover:bg-primary hover:text-primary-foreground disabled:cursor-not-allowed disabled:opacity-40";

export function QuestList({
  member,
  done,
  available,
  habits,
  doses,
}: {
  member: { id: string; name: string };
  done: QuestKey[];
  available: QuestKey[];
  habits: Partial<Record<HabitKind, number>>;
  doses: { taken: number; due: number };
}) {
  const { can } = useAccess();
  const canLog = can("vitals.log", member.id);
  const [pending, start] = useTransition();
  const [values, setValue] = useOptimistic(habits, (cur, p: { kind: HabitKind; value: number }) => ({ ...cur, [p.kind]: p.value }));

  const change = (kind: HabitKind, next: number) =>
    start(async () => {
      setValue({ kind, value: next });
      const res = await logHabit({ memberId: member.id, kind, value: next });
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      if (res.data?.questDone) {
        toast.success(res.message, { description: res.data.leveledUp ? `New level: ${res.data.level}` : `Streak: ${res.data.streak} day${res.data.streak === 1 ? "" : "s"}` });
      }
    });

  const quests = QUESTS.filter((q) => available.includes(q.key));

  return (
    <ul className="divide-y divide-border">
      {quests.map((q) => {
        const isDone = done.includes(q.key);
        const habit = q.habit;
        const Icon = QUEST_ICON[q.key];
        const value = habit ? values[habit] ?? 0 : q.key === "meds" ? doses.taken : isDone ? 1 : 0;
        const goal = q.key === "meds" ? doses.due : q.goal;
        const pct = Math.min(100, Math.round((value / Math.max(1, goal)) * 100));
        return (
          <li key={q.key} className="flex items-center gap-3.5 py-3 first:pt-0 last:pb-0 sm:gap-4">
            <span
              className={cn(
                "flex size-10 shrink-0 items-center justify-center rounded-xl transition-colors duration-200",
                isDone ? "bg-success-soft text-success" : "bg-surface text-muted-foreground"
              )}
            >
              <Icon className="size-5" aria-hidden="true" />
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
                <p className="text-[0.9375rem] font-medium">{q.title}</p>
                <p className="flex shrink-0 items-center gap-2 text-sm text-muted-foreground">
                  {isDone && (
                    <span className="inline-flex items-center gap-1 font-medium text-success">
                      <Check className="size-3.5" strokeWidth={2.5} aria-hidden="true" /> Done
                    </span>
                  )}
                  <span className="tabular">{q.key === "vital" ? (isDone ? "1/1" : "0/1") : `${value}/${goal}${q.unit ? ` ${q.unit}` : ""}`}</span>
                </p>
              </div>
              <div className="mt-2 h-1 overflow-hidden rounded-full bg-muted" aria-hidden="true">
                <div className={cn("h-full rounded-full transition-[width] duration-300 ease-out", isDone ? "bg-success" : "bg-brand")} style={{ width: `${pct}%` }} />
              </div>
              <p className="sr-only">{isDone ? "Quest complete." : "Not done yet."} Worth {q.xp} XP.</p>
            </div>
            {habit ? (
              <div className="flex shrink-0 items-center gap-1.5">
                <button
                  type="button"
                  aria-label={`Less ${q.short.toLowerCase()}`}
                  disabled={!canLog || pending || value <= 0}
                  onClick={() => change(habit, Math.max(0, value - STEP[habit]))}
                  className="flex size-10 cursor-pointer items-center justify-center rounded-full border border-border text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <Minus className="size-4" aria-hidden="true" />
                </button>
                <button
                  type="button"
                  aria-label={`More ${q.short.toLowerCase()}`}
                  disabled={!canLog || pending || value >= MAX[habit]}
                  onClick={() => change(habit, value + STEP[habit])}
                  className={STEP_PLUS}
                >
                  <Plus className="size-4" strokeWidth={2.5} aria-hidden="true" />
                </button>
              </div>
            ) : q.key === "meds" ? (
              <Link href={`/medications?member=${member.id}`} aria-label="Go to today's medicines" className="flex size-10 shrink-0 items-center justify-center rounded-full border border-border text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
                <ChevronRight className="size-5" aria-hidden="true" />
              </Link>
            ) : !isDone && canLog ? (
              <VitalDialog
                members={[member]}
                defaultMemberId={member.id}
                trigger={
                  <button type="button" aria-label="Record a reading" className={STEP_PLUS}>
                    <Plus className="size-4" strokeWidth={2.5} aria-hidden="true" />
                  </button>
                }
              />
            ) : (
              <span className="size-10 shrink-0" aria-hidden="true" />
            )}
          </li>
        );
      })}
    </ul>
  );
}
