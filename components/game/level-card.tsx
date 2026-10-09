import { Fruit, type FruitKind } from "@/components/fruits/fruit";
import type { levelFor } from "@/lib/gamification";
import { cn } from "@/lib/utils";

export function LevelProgress({ level, xp, onDark = false, className }: { level: ReturnType<typeof levelFor>; xp: number; onDark?: boolean; className?: string }) {
  return (
    <div className={cn("flex items-center gap-3", className)}>
      <span className={cn("flex size-14 shrink-0 items-center justify-center rounded-2xl", onDark ? "bg-brand-foreground/15" : "bg-fruit-leaf-soft")}>
        <Fruit kind={level.stage as FruitKind} className="size-11" />
      </span>
      <div className="min-w-0 flex-1">
        <p className={cn("text-sm font-medium", onDark ? "opacity-85" : "text-muted-foreground")}>Level {level.level}</p>
        <p className="font-heading text-lg leading-tight font-bold">{level.name}</p>
        <div className={cn("mt-1.5 h-2 overflow-hidden rounded-full", onDark ? "bg-brand-foreground/20" : "bg-muted")} role="progressbar" aria-label={`Progress to ${level.next?.name ?? "max level"}`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(level.progress * 100)}>
          <div className="h-full rounded-full bg-fruit-lemon transition-[width] duration-500" style={{ width: `${Math.round(level.progress * 100)}%` }} />
        </div>
        <p className={cn("mt-1 text-xs", onDark ? "opacity-85" : "text-muted-foreground")}>
          <span className="tabular">{xp.toLocaleString("en-IN")} XP</span>
          {level.next ? ` · ${level.xpToNext} to ${level.next.name}` : " · top level!"}
        </p>
      </div>
    </div>
  );
}
