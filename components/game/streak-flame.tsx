import { Flame } from "lucide-react";
import { cn } from "@/lib/utils";

export function StreakFlame({ days, className, size = "md", onDark = false }: { days: number; className?: string; size?: "sm" | "md" | "lg"; onDark?: boolean }) {
  const lit = days > 0;
  return (
    <span className={cn("inline-flex items-baseline gap-1.5 font-heading font-semibold tabular", size === "lg" ? "text-2xl" : size === "sm" ? "text-sm" : "text-lg", className)}>
      <Flame
        className={cn("self-center", size === "lg" ? "size-5" : "size-4", lit ? (onDark ? "text-brand-foreground" : "text-brand") : onDark ? "text-brand-foreground/60" : "text-muted-foreground")}
        strokeWidth={2.25}
        aria-hidden="true"
      />
      {days}
      <span className={cn("font-sans text-sm font-normal", onDark ? "text-brand-foreground/80" : "text-muted-foreground")}>day{days === 1 ? "" : "s"}</span>
    </span>
  );
}
