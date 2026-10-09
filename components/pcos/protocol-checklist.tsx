"use client";

import { useOptimistic, useTransition } from "react";
import { Check, Moon, Sun, Sunrise, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { toggleProtocol } from "@/app/actions/pcos";
import { useAccess } from "@/components/providers/access-provider";
import type { ProtocolAction } from "@/lib/pcos";
import { cn } from "@/lib/utils";

const BLOCK = { morning: { label: "Morning", icon: Sunrise }, midday: { label: "Midday", icon: Sun }, evening: { label: "Evening", icon: Moon }, anytime: { label: "Any time", icon: Sparkles } } as const;

export function ProtocolChecklist({ memberId, actions, done }: { memberId: string; actions: ProtocolAction[]; done: string[] }) {
  const { can } = useAccess();
  const allowed = can("vitals.log", memberId);
  const [, start] = useTransition();
  const [state, setState] = useOptimistic(done, (cur, p: { key: string; on: boolean }) => (p.on ? [...cur, p.key] : cur.filter((k) => k !== p.key)));
  const toggle = (key: string, on: boolean) =>
    start(async () => {
      setState({ key, on });
      const res = await toggleProtocol({ memberId, actionKey: key, done: on });
      if (!res.ok) toast.error(res.error);
      else if (on && state.length + 1 === actions.length) toast.success("Every action done for today.");
    });
  return (
    <div className="flex flex-col gap-5">
      {(Object.keys(BLOCK) as (keyof typeof BLOCK)[]).map((b) => {
        const list = actions.filter((a) => a.block === b);
        if (!list.length) return null;
        const Icon = BLOCK[b].icon;
        return (
          <section key={b}>
            <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold text-muted-foreground"><Icon className="size-4" aria-hidden="true" /> {BLOCK[b].label}</h3>
            <ul className="grid gap-2 sm:grid-cols-2">
              {list.map((a) => {
                const on = state.includes(a.key);
                return (
                  <li key={a.key}>
                    <button
                      type="button"
                      disabled={!allowed}
                      aria-pressed={on}
                      onClick={() => toggle(a.key, !on)}
                      className={cn("flex w-full cursor-pointer items-center gap-3 rounded-2xl border p-3.5 text-left transition-colors duration-150 disabled:cursor-not-allowed", on ? "border-success-border bg-success-soft/60" : "border-border bg-card hover:bg-muted/60")}
                    >
                      <span className={cn("flex size-8 shrink-0 items-center justify-center rounded-full border-2 transition-colors", on ? "border-success bg-success text-card" : "border-border-strong")}>
                        <Check className={cn("size-4", on ? "opacity-100" : "opacity-0")} strokeWidth={3} aria-hidden="true" />
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
