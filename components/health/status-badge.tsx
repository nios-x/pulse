import type { ReactNode } from "react";
import { CircleAlertIcon, CircleCheckIcon, CircleDotIcon, TriangleAlertIcon, type LucideIcon } from "lucide-react";
import type { Tone } from "@/lib/vitals";
import { cn } from "@/lib/utils";

const TONES: Record<Tone, { icon: LucideIcon; className: string }> = {
  ok: { icon: CircleCheckIcon, className: "bg-ok-wash text-ok-ink ring-ok/25" },
  watch: { icon: TriangleAlertIcon, className: "bg-watch-wash text-watch-ink ring-watch/40" },
  alert: { icon: CircleAlertIcon, className: "bg-alert-wash text-alert-ink ring-alert/25" },
  neutral: { icon: CircleDotIcon, className: "bg-well text-ink-2 ring-edge" },
};

/**
 * A health status: icon + words, never colour alone. "High · 150/95".
 * `size="lg"` for the hero numbers on a member's overview.
 */
export function StatusBadge({
  tone,
  children,
  size = "md",
  className,
}: {
  tone: Tone;
  children: ReactNode;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const { icon: Icon, className: toneClass } = TONES[tone];
  return (
    <span
      className={cn(
        "inline-flex w-fit shrink-0 items-center gap-1.5 rounded-full font-medium whitespace-nowrap ring-1 ring-inset tabular",
        size === "sm" && "h-7 px-2.5 text-sm",
        size === "md" && "h-8 px-3 text-[0.9375rem]",
        size === "lg" && "h-10 px-3.5 text-base",
        toneClass,
        className
      )}
    >
      <Icon className={cn("shrink-0", size === "lg" ? "size-5" : "size-4")} aria-hidden />
      {children}
    </span>
  );
}
