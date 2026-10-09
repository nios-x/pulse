"use client";

import { useOptimistic, useTransition } from "react";
import { toast } from "sonner";
import { logSymptom } from "@/app/actions/pcos";
import { floatLabel, pop } from "@/components/game/rewards";
import { useAccess } from "@/components/providers/access-provider";
import { PCOS_SYMPTOMS } from "@/lib/pcos";
import { cn } from "@/lib/utils";

const LEVEL = ["Not today", "Mild", "Moderate", "Strong"];

/** Tap a symptom to cycle: not today → mild → moderate → strong. */
export function SymptomLogger({ memberId, today }: { memberId: string; today: Record<string, number> }) {
  const { can } = useAccess();
  const allowed = can("vitals.log", memberId);
  const [, start] = useTransition();
  const [state, set] = useOptimistic(today, (cur, p: { k: string; v: number }) => ({ ...cur, [p.k]: p.v }));
  return (
    <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
      {PCOS_SYMPTOMS.map((s) => {
        const v = state[s.key] ?? 0;
        return (
          <li key={s.key}>
            <button
              type="button"
              disabled={!allowed}
              onClick={(e) => {
                const next = (v + 1) % 4;
                // A quiet acknowledgement, never a celebration: logging how you feel is care, not a score.
                pop(e.currentTarget, 0.35);
                if (v === 0) floatLabel(e.currentTarget, "Noted", "soft");
                start(async () => {
                  set({ k: s.key, v: next });
                  const res = await logSymptom({ memberId, symptom: s.key, severity: next });
                  if (!res.ok) toast.error(res.error);
                });
              }}
              aria-label={`${s.label}: ${LEVEL[v]}. Tap to change`}
              className={cn(
                "flex min-h-16 w-full cursor-pointer flex-col items-start justify-center gap-1 rounded-2xl border px-3.5 py-2 text-left transition-colors disabled:cursor-not-allowed",
                v === 0 ? "border-border bg-card hover:bg-muted/60" : v === 1 ? "border-brand/30 bg-brand-soft" : v === 2 ? "border-brand/60 bg-brand-soft" : "border-brand bg-brand-soft"
              )}
            >
              <span className="text-[0.9375rem] font-semibold">{s.label}</span>
              <span className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                <span className="flex gap-0.5" aria-hidden="true">
                  {[1, 2, 3].map((i) => <span key={i} className={cn("size-1.5 rounded-full", i <= v ? "bg-foreground" : "bg-border-strong")} />)}
                </span>
                {LEVEL[v]}
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
