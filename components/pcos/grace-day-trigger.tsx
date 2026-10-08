"use client";

import { useState } from "react";
import { ShieldCheckIcon, HeartHandshakeIcon, CheckIcon } from "lucide-react";
import { recordGraceDayAction } from "@/app/actions/pcos";
import { Button } from "@/components/ui/button";
import type { GraceDay, GraceDayReason } from "@/db/schema";

interface GraceDayProps {
  patientId: string;
  todayGraceDay: GraceDay | null;
}

export function GraceDayTrigger({ patientId, todayGraceDay }: GraceDayProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSelectReason = async (reason: GraceDayReason) => {
    setIsSubmitting(true);
    try {
      await recordGraceDayAction(patientId, reason);
      setIsOpen(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (todayGraceDay) {
    return (
      <div className="rounded-2xl border border-teal-500/30 bg-teal-50/70 dark:bg-teal-950/30 p-4.5 flex items-start gap-3.5">
        <ShieldCheckIcon className="size-6 text-teal-600 shrink-0 mt-0.5" />
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h4 className="text-sm font-bold text-teal-950 dark:text-teal-100">
              Grace Day Active · Streak Protected
            </h4>
            <span className="rounded-full bg-teal-200/70 dark:bg-teal-900 px-2 py-0.5 text-[0.65rem] font-bold text-teal-800 dark:text-teal-200 uppercase">
              {todayGraceDay.reason.replace("_", " ")}
            </span>
          </div>
          <p className="text-xs text-teal-800 dark:text-teal-200 mt-1 leading-relaxed">
            Your body doesn&apos;t keep score of tough days. Resting and recovering is clinical care,
            not missed progress.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-border/70 bg-card p-4.5 flex flex-col gap-3">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <HeartHandshakeIcon className="size-5 text-teal-600 shrink-0 mt-0.5" />
          <div>
            <h4 className="text-sm font-semibold text-foreground">
              Tough Day? Take a Grace Day
            </h4>
            <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
              Period cramps, severe fatigue, or exam stress? Protect your consistency score without
              pressure.
            </p>
          </div>
        </div>

        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setIsOpen(!isOpen)}
          className="rounded-xl text-xs font-semibold shrink-0 border-teal-500/30 text-teal-700 hover:bg-teal-50"
        >
          {isOpen ? "Close" : "Rest Today"}
        </Button>
      </div>

      {isOpen && (
        <div className="pt-2 border-t border-border/50 flex flex-col gap-2">
          <p className="text-xs font-medium text-foreground">What describes today best?</p>
          <div className="grid grid-cols-2 gap-2">
            {[
              { id: "period", label: "🩸 Period / Cramps" },
              { id: "flare_up", label: "⚡ PCOS Flare-up" },
              { id: "mental_health", label: "🧠 High Stress / Mental" },
              { id: "sick", label: "🤒 Sick / Unwell" },
              { id: "travel", label: "✈️ Travel / Busy" },
            ].map((item) => (
              <button
                key={item.id}
                type="button"
                disabled={isSubmitting}
                onClick={() => handleSelectReason(item.id as GraceDayReason)}
                className="p-2.5 rounded-xl border border-border/70 bg-background text-xs font-semibold text-left hover:border-teal-500 hover:bg-teal-50/40 transition-colors"
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
