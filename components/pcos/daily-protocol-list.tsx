"use client";

import { useState } from "react";
import { CheckCircle2Icon, CircleIcon, PillIcon, SparklesIcon } from "lucide-react";
import { toggleDailyAction } from "@/app/actions/pcos";
import type { DailyAction } from "@/lib/pcos-protocols";

interface ProtocolListProps {
  patientId: string;
  actions: DailyAction[];
  completedKeys: string[];
}

export function DailyProtocolList({ patientId, actions, completedKeys: initialCompleted }: ProtocolListProps) {
  const [completed, setCompleted] = useState<Set<string>>(new Set(initialCompleted));
  const [isUpdating, setIsUpdating] = useState<string | null>(null);

  const handleToggle = async (key: string) => {
    setIsUpdating(key);
    const next = new Set(completed);
    const isNowDone = !next.has(key);
    if (isNowDone) {
      next.add(key);
    } else {
      next.delete(key);
    }
    setCompleted(next);

    try {
      await toggleDailyAction(patientId, key, isNowDone);
    } finally {
      setIsUpdating(null);
    }
  };

  const groups = [
    { id: "morning", label: "Morning Routine" },
    { id: "midday", label: "Midday & Lunch" },
    { id: "afternoon", label: "Afternoon Reset" },
    { id: "evening", label: "Evening & Dinner" },
    { id: "anytime", label: "Daily Habits" },
  ];

  const totalCount = actions.length;
  const doneCount = actions.filter((a) => completed.has(a.key)).length;
  const progressPercent = totalCount > 0 ? Math.round((doneCount / totalCount) * 100) : 0;

  return (
    <div className="flex flex-col gap-5">
      {/* Progress tracker */}
      <div className="rounded-2xl border border-teal-500/20 bg-teal-50/50 dark:bg-teal-950/20 p-4 flex flex-col gap-2.5">
        <div className="flex items-center justify-between text-xs font-semibold">
          <span className="text-teal-900 dark:text-teal-100 flex items-center gap-1.5">
            <SparklesIcon className="size-3.5 text-teal-600" /> Today&apos;s Protocol Progress
          </span>
          <span className="text-teal-700 dark:text-teal-300">
            {doneCount} of {totalCount} completed ({progressPercent}%)
          </span>
        </div>
        <div className="h-2 w-full rounded-full bg-teal-200/60 dark:bg-teal-900/60 overflow-hidden">
          <div
            className="h-full bg-teal-600 transition-all duration-300 rounded-full"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* Action cards grouped by time of day */}
      <div className="flex flex-col gap-4">
        {groups.map((grp) => {
          const groupActions = actions.filter((a) => a.timeBlock === grp.id);
          if (groupActions.length === 0) return null;

          return (
            <div key={grp.id} className="flex flex-col gap-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground px-1">
                {grp.label}
              </h3>

              <div className="flex flex-col gap-2">
                {groupActions.map((act) => {
                  const isDone = completed.has(act.key);
                  return (
                    <button
                      key={act.key}
                      type="button"
                      onClick={() => handleToggle(act.key)}
                      disabled={isUpdating === act.key}
                      className={`flex items-start gap-3.5 p-4 rounded-2xl border text-left transition-all ${
                        isDone
                          ? "border-teal-500/30 bg-teal-50/30 dark:bg-teal-950/20 opacity-75"
                          : "border-border/70 bg-card hover:border-teal-500/40 shadow-xs"
                      }`}
                    >
                      <div className="mt-0.5 shrink-0 text-teal-600">
                        {isDone ? (
                          <CheckCircle2Icon className="size-5 text-teal-600" />
                        ) : (
                          <CircleIcon className="size-5 text-muted-foreground/40" />
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span
                            className={`text-sm font-semibold truncate ${
                              isDone ? "line-through text-muted-foreground" : "text-foreground"
                            }`}
                          >
                            {act.label.en}
                          </span>
                          {act.fromPrescription && (
                            <span className="inline-flex items-center gap-1 rounded-md bg-teal-100 dark:bg-teal-900/50 px-1.5 py-0.5 text-[0.65rem] font-semibold text-teal-700 dark:text-teal-300">
                              <PillIcon className="size-2.5" /> Rx
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                          {act.description.en}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
