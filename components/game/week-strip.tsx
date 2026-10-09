import { Check, Moon } from "lucide-react";
import { cn } from "@/lib/utils";

const fmt = new Intl.DateTimeFormat("en-IN", { weekday: "narrow", timeZone: "UTC" });

export function WeekStrip({ days, onDark = false }: { days: { date: string; complete: boolean; grace: boolean; quests: number }[]; onDark?: boolean }) {
  return (
    <ol className="flex gap-1.5" aria-label="Last 7 days">
      {days.map((d, i) => {
        const today = i === days.length - 1;
        return (
          <li key={d.date} className="flex flex-col items-center gap-1.5">
            <span
              className={cn(
                "flex size-8 items-center justify-center rounded-lg text-xs font-medium tabular",
                d.complete
                  ? onDark
                    ? "bg-brand-foreground text-brand"
                    : "bg-brand text-brand-foreground"
                  : d.grace
                    ? "border border-dashed border-border-strong text-muted-foreground"
                    : onDark
                      ? "bg-brand-foreground/10 text-brand-foreground/80"
                      : "bg-muted text-muted-foreground",
                today && "ring-2 ring-offset-2 " + (onDark ? "ring-brand-foreground/70 ring-offset-brand" : "ring-brand/50 ring-offset-card")
              )}
              title={d.complete ? "Streak day" : d.grace ? "Rest day" : `${d.quests} quests`}
            >
              {d.complete ? <Check className="size-4" strokeWidth={2.5} aria-hidden="true" /> : d.grace ? <Moon className="size-3.5" aria-hidden="true" /> : d.quests || ""}
              <span className="sr-only">
                {d.date}: {d.complete ? "streak day" : d.grace ? "rest day" : `${d.quests} quests done`}
              </span>
            </span>
            <span className={cn("text-xs", today ? "font-semibold" : "", onDark ? "text-brand-foreground/80" : today ? "text-foreground" : "text-muted-foreground")}>
              {fmt.format(new Date(`${d.date}T00:00:00Z`))}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
