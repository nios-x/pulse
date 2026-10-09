import Link from "next/link";
import { ChevronRight, CircleAlert, HeartPulse, Info, Pill, PillBottle, ShieldAlert, TriangleAlert } from "lucide-react";
import type { Alert } from "@/lib/alerts";
import { cn } from "@/lib/utils";

const KIND_ICON = {
  missed_dose: Pill,
  abnormal_vital: HeartPulse,
  refill: PillBottle,
  interaction: ShieldAlert,
  duplicate: CircleAlert,
} as const;

const SEVERITY = {
  urgent: { word: "Urgent", icon: TriangleAlert, chip: "bg-danger-soft text-danger border-danger-border", well: "bg-danger-soft text-danger" },
  warning: { word: "Needs attention", icon: TriangleAlert, chip: "bg-warning-soft text-warning border-warning-border", well: "bg-warning-soft text-warning" },
  info: { word: "Heads up", icon: Info, chip: "bg-info-soft text-info border-transparent", well: "bg-info-soft text-info" },
} as const;

export function AlertList({ alerts, limit }: { alerts: Alert[]; limit?: number }) {
  const shown = limit ? alerts.slice(0, limit) : alerts;
  return (
    <ul className="divide-y divide-border">
      {shown.map((a) => {
        const Icon = KIND_ICON[a.kind];
        const s = SEVERITY[a.severity];
        const SevIcon = s.icon;
        return (
          <li key={a.id}>
            <Link href={a.href} className="group flex items-start gap-3.5 px-5 py-4 transition-colors duration-150 hover:bg-muted/60 focus-visible:outline-offset-[-2px] sm:px-6">
              <span className={cn("mt-0.5 flex size-10 shrink-0 items-center justify-center rounded-full", s.well)}>
                <Icon className="size-5" aria-hidden="true" />
              </span>
              <div className="min-w-0 flex-1 space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-base font-semibold">{a.title}</p>
                  <span className={cn("inline-flex h-6 items-center gap-1 rounded-full border px-2 text-xs font-medium", s.chip)}>
                    <SevIcon className="size-3.5" aria-hidden="true" />
                    {s.word}
                  </span>
                </div>
                <p className="text-[0.9375rem] text-muted-foreground">{a.detail}</p>
              </div>
              <ChevronRight className="mt-2.5 size-5 shrink-0 text-muted-foreground transition-transform duration-150 group-hover:translate-x-0.5" aria-hidden="true" />
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
