"use client";

import { useOptimistic, useTransition } from "react";
import { Check, Moon, Sun, Sunrise, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { toggleProtocol } from "@/app/actions/pcos";
import { burst, buzz, celebrate, floatLabel, pop } from "@/components/game/rewards";
import { useAccess } from "@/components/providers/access-provider";
import type { ProtocolAction } from "@/lib/pcos";
import { cn } from "@/lib/utils";

const BLOCK = { morning: { label: "Morning", icon: Sunrise }, midday: { label: "Midday", icon: Sun }, evening: { label: "Evening", icon: Moon }, anytime: { label: "Any time", icon: Sparkles } } as const;

export function ProtocolChecklist({ memberId, actions, done }: { memberId: string; actions: ProtocolAction[]; done: string[] }) {
  const { can } = useAccess();
  const allowed = can("vitals.log", memberId);
  const [, start] = useTransition();
  const [state, setState] = useOptimistic(done, (cur, p: { key: string; on: boolean }) => (p.on ? [...cur, p.key] : cur.filter((k) => k !== p.key)));
  const count = actions.filter((a) => state.includes(a.key)).length;
  const complete = count === actions.length;

  const toggle = (action: ProtocolAction, on: boolean, button: HTMLButtonElement) => {
    if (on) {
      // Reward straight away; the save follows in the background.
      const tick = button.querySelector("[data-tick]");
      const after = [...state, action.key];
      const blockDone = actions.filter((a) => a.block === action.block).every((a) => after.includes(a.key));
      const dayDone = actions.every((a) => after.includes(a.key));
      buzz();
      pop(tick, 1.2);
      burst(tick, { count: 10, spread: 56 });
      floatLabel(tick, "+5 XP");
      if (blockDone && !dayDone) setTimeout(() => floatLabel(button.closest("section")?.querySelector("h3"), `${BLOCK[action.block].label} done`, "soft"), 350);
      if (dayDone) setTimeout(() => celebrate({ title: "Today's plan, complete", message: "Every gentle step done. Your streak grows with you." }), 450);
    }
    start(async () => {
      setState({ key: action.key, on });
      const res = await toggleProtocol({ memberId, actionKey: action.key, done: on });
      if (!res.ok) toast.error(res.error);
    });
  };

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center gap-3">
        <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-muted" role="progressbar" aria-label="Today's plan" aria-valuemin={0} aria-valuemax={actions.length} aria-valuenow={count}>
          <div className={cn("h-full rounded-full transition-[width,background-color] duration-500 ease-out", complete ? "reward-sheen bg-success" : "bg-brand")} style={{ width: `${(count / Math.max(1, actions.length)) * 100}%` }} />
        </div>
        <span className={cn("font-heading text-sm font-bold tabular", complete ? "text-success" : "text-muted-foreground")}>{complete ? "All done" : `${count} / ${actions.length}`}</span>
      </div>
      {(Object.keys(BLOCK) as (keyof typeof BLOCK)[]).map((b) => {
        const list = actions.filter((a) => a.block === b);
        if (!list.length) return null;
        const Icon = BLOCK[b].icon;
        const blockDone = list.every((a) => state.includes(a.key));
        return (
          <section key={b}>
            <h3 className={cn("mb-2 flex items-center gap-2 text-sm font-semibold transition-colors", blockDone ? "text-success" : "text-muted-foreground")}>
              <Icon className="size-4" aria-hidden="true" /> {BLOCK[b].label}
              {blockDone && <Check className="size-4" strokeWidth={3} aria-label="all done" />}
            </h3>
            <ul className="grid gap-2 sm:grid-cols-2">
              {list.map((a) => {
                const on = state.includes(a.key);
                return (
                  <li key={a.key}>
                    <button
                      type="button"
                      disabled={!allowed}
                      aria-pressed={on}
                      onClick={(e) => toggle(a, !on, e.currentTarget)}
                      className={cn("flex w-full cursor-pointer items-center gap-3 rounded-2xl border p-3.5 text-left transition-[color,background-color,border-color,transform] duration-150 active:scale-[0.98] disabled:cursor-not-allowed", on ? "border-success-border bg-success-soft/60" : "border-border bg-card hover:bg-muted/60")}
                    >
                      <span data-tick className={cn("flex size-8 shrink-0 items-center justify-center rounded-full border-2 transition-colors", on ? "border-success bg-success text-card" : "border-border-strong")}>
                        <Check className={cn("size-4 transition-[opacity,transform] duration-200", on ? "scale-100 opacity-100" : "scale-50 opacity-0")} strokeWidth={3} aria-hidden="true" />
                      </span>
                      <span className="min-w-0">
                        <span className={cn("block text-[0.9375rem] font-semibold", on && "text-muted-foreground line-through decoration-2")}>{a.title}</span>
                        <span className="block text-sm text-muted-foreground">{a.detail}</span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
