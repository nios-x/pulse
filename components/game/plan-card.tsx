"use client";

import { useTransition } from "react";
import { Brain, Footprints, Moon, Pill, Salad, Sparkles, Activity } from "lucide-react";
import { toast } from "sonner";
import { startCarePlan } from "@/app/actions/habits";
import { RoleGate } from "@/components/health/role-gate";
import { Button } from "@/components/ui/button";
import type { PlanItem } from "@/db/schema";
import { cn } from "@/lib/utils";

const ICON: Record<PlanItem["category"], typeof Pill> = { move: Footprints, eat: Salad, sleep: Moon, track: Activity, meds: Pill, mind: Brain };
const TINT: Record<PlanItem["category"], string> = {
  move: "bg-fruit-leaf-soft text-success",
  eat: "bg-fruit-orange-soft text-warning",
  sleep: "bg-fruit-lemon-soft text-warning",
  track: "bg-fruit-berry-soft text-danger",
  meds: "bg-fruit-grape-soft text-accent-foreground",
  mind: "bg-fruit-water-soft text-info",
};

export function PlanCard({ memberId, firstName, plan, suggestions }: { memberId: string; firstName: string; plan: { startedOn: string; items: PlanItem[]; days: number } | null; suggestions: PlanItem[] }) {
  const [pending, start] = useTransition();
  const items = plan?.items ?? suggestions;
  return (
    <div className="flex flex-col gap-4">
      {plan ? (
        <p className="flex items-center gap-2 text-[0.9375rem] text-muted-foreground">
          <Sparkles className="size-4 text-primary" aria-hidden="true" />
          {firstName} has been on this plan for <span className="font-semibold text-foreground">{plan.days} days</span>.
        </p>
      ) : (
        <p className="text-[0.9375rem] text-muted-foreground">Picked for {firstName} from their conditions and recent readings. Start it to track progress week by week.</p>
      )}
      <ul className="grid gap-2.5 sm:grid-cols-2">
        {items.map((i) => {
          const Icon = ICON[i.category];
          return (
            <li key={i.key} className="flex gap-3 rounded-2xl border border-border bg-card p-3.5">
              <span className={cn("flex size-10 shrink-0 items-center justify-center rounded-xl", TINT[i.category])}>
                <Icon className="size-5" aria-hidden="true" />
              </span>
              <span className="min-w-0">
                <span className="block text-[0.9375rem] font-semibold">{i.title}</span>
                <span className="block text-sm text-muted-foreground">{i.detail}</span>
              </span>
            </li>
          );
        })}
      </ul>
      <div className="flex flex-wrap items-center gap-3">
        <RoleGate action="member.edit" memberId={memberId}>
          <Button
            variant={plan ? "outline" : "default"}
            disabled={pending}
            onClick={() =>
              start(async () => {
                const res = await startCarePlan(memberId);
                if (res.ok) toast.success(res.message);
                else toast.error(res.error);
              })
            }
          >
            <Sparkles aria-hidden="true" /> {plan ? "Refresh plan" : "Start this plan"}
          </Button>
        </RoleGate>
        <p className="text-sm text-muted-foreground">Everyday habits only. Never change medicines without your doctor.</p>
      </div>
    </div>
  );
}
