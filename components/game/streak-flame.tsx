import { Flame } from "lucide-react";
import { cn } from "@/lib/utils";

export function StreakFlame({ days, className, size = "md", onDark = false }: { days: number; className?: string; size?: "sm" | "md" | "lg"; onDark?: boolean }) {
  const lit = days > 0;
  return (
    <span className={cn("inline-flex items-center gap-1.5 font-heading font-extrabold tabular", size === "lg" ? "text-3xl" : size === "sm" ? "text-sm" : "text-lg", className)}>
      <span className={cn("relative flex items-center justify-center rounded-full", size === "lg" ? "size-12" : size === "sm" ? "size-7" : "size-9", lit ? "bg-fruit-orange-soft" : onDark ? "bg-brand-foreground/15" : "bg-muted")}>
        <Flame className={cn(size === "lg" ? "size-7" : size === "sm" ? "size-4" : "size-5", lit ? "fill-fruit-orange text-fruit-orange motion-safe:animate-flicker" : "text-muted-foreground")} aria-hidden="true" />
      </span>
      {days}
      <span className={cn("font-sans font-medium", size === "lg" ? "text-base" : "text-sm", onDark ? "opacity-85" : "text-muted-foreground")}>day{days === 1 ? "" : "s"}</span>
    </span>
  );
}
