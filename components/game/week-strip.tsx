import { Check, Moon } from "lucide-react";
import { cn } from "@/lib/utils";

const fmt = new Intl.DateTimeFormat("en-IN", { weekday: "narrow", timeZone: "UTC" });

export function WeekStrip({ days, onDark = false }: { days: { date: string; complete: boolean; grace: boolean; quests: number }[]; onDark?: boolean }) {
  return (
    <ol className="flex gap-1.5" aria-label="Last 7 days">
      {days.map((d, i) => {
        const today = i === days.length - 1;
        return (
          <li key={d.date} className="flex flex-col items-center gap-1">
            <span
              className={cn(
                "flex size-8 items-center justify-center rounded-full border-2 text-xs font-bold",
                d.complete ? "border-fruit-orange bg-fruit-orange text-fruit-ink" : d.grace ? "border-dashed border-fruit-grape bg-fruit-grape-soft text-fruit-grape" : onDark ? "border-brand-foreground/30" : "border-border-strong",
                today && !d.complete && "border-fruit-lemon"
              )}
              title={d.complete ? "Streak day" : d.grace ? "Rest day" : `${d.quests} quests`}
            >
              {d.complete ? <Check className="size-4" strokeWidth={3} aria-hidden="true" /> : d.grace ? <Moon className="size-3.5" aria-hidden="true" /> : d.quests || ""}
              <span className="sr-only">{d.date}: {d.complete ? "streak day" : d.grace ? "rest day" : `${d.quests} quests done`}</span>
            </span>
            <span className={cn("text-xs", onDark ? "opacity-80" : "text-muted-foreground")}>{fmt.format(new Date(`${d.date}T00:00:00Z`))}</span>
          </li>
        );
      })}
    </ol>
  );
}
