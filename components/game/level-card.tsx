import type { levelFor } from "@/lib/gamification";
import { cn } from "@/lib/utils";

export function LevelProgress({ level, xp, onDark = false, className }: { level: ReturnType<typeof levelFor>; xp: number; onDark?: boolean; className?: string }) {
  const pct = Math.round(level.progress * 100);
  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <div className="flex items-baseline justify-between gap-3">
        <p className="font-heading text-base font-semibold">
          {level.name}
          <span className={cn("ml-2 font-sans text-sm font-normal", onDark ? "text-brand-foreground/80" : "text-muted-foreground")}>Level {level.level}</span>
        </p>
        <span className={cn("text-sm tabular", onDark ? "text-brand-foreground/80" : "text-muted-foreground")}>{xp.toLocaleString("en-IN")} XP</span>
      </div>
      <div
        className={cn("h-1.5 overflow-hidden rounded-full", onDark ? "bg-brand-foreground/20" : "bg-muted")}
        role="progressbar"
        aria-label={`Progress to ${level.next?.name ?? "max level"}`}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={pct}
      >
        <div className={cn("h-full rounded-full transition-[width] duration-500", onDark ? "bg-brand-foreground" : "bg-brand")} style={{ width: `${pct}%` }} />
      </div>
      <p className={cn("text-sm", onDark ? "text-brand-foreground/80" : "text-muted-foreground")}>
        {level.next ? (
          <>
            <span className="tabular">{level.xpToNext.toLocaleString("en-IN")} XP</span> to {level.next.name}
          </>
        ) : (
          "Top level reached"
        )}
      </p>
    </div>
  );
}
