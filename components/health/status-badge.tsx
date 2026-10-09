import { ArrowDown, ArrowUp, CircleCheck, CircleMinus, Clock, TriangleAlert, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export type Tone = "success" | "warning" | "danger" | "info" | "neutral";

const TONE_CLASS: Record<Tone, string> = {
  success: "border-success-border bg-success-soft text-success",
  warning: "border-warning-border bg-warning-soft text-warning",
  danger: "border-danger-border bg-danger-soft text-danger",
  info: "border-transparent bg-info-soft text-info",
  neutral: "border-transparent bg-muted text-muted-foreground",
};

const DEFAULT_ICON: Record<Tone, LucideIcon> = {
  success: CircleCheck,
  warning: TriangleAlert,
  danger: TriangleAlert,
  info: Clock,
  neutral: CircleMinus,
};

/**
 * Status is never colour alone: always an icon and a word, optionally a value.
 * e.g. <StatusBadge tone="danger" label="High" value="150/95" />
 */
export function StatusBadge({
  tone,
  label,
  value,
  icon,
  className,
  size = "md",
}: {
  tone: Tone;
  label: string;
  value?: string;
  icon?: LucideIcon;
  className?: string;
  size?: "sm" | "md";
}) {
  const Icon = icon ?? DEFAULT_ICON[tone];
  return (
    <span
      className={cn(
        "inline-flex w-fit shrink-0 items-center gap-1.5 rounded-full border font-medium whitespace-nowrap",
        size === "sm" ? "h-6 px-2 text-xs" : "h-7 px-2.5 text-sm",
        TONE_CLASS[tone],
        className
      )}
    >
      <Icon className={size === "sm" ? "size-3.5" : "size-4"} aria-hidden="true" />
      <span>
        {label}
        {value && <span className="tabular"> · {value}</span>}
      </span>
    </span>
  );
}

/** Maps a vital status to a tone and icon. */
export function vitalTone(status: "normal" | "watch" | "high" | "low"): { tone: Tone; icon: LucideIcon } {
  switch (status) {
    case "normal":
      return { tone: "success", icon: CircleCheck };
    case "watch":
      return { tone: "warning", icon: ArrowUp };
    case "high":
      return { tone: "danger", icon: ArrowUp };
    case "low":
      return { tone: "danger", icon: ArrowDown };
  }
}
