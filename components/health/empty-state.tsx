import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
  compact = false,
}: {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
  compact?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-xl border border-dashed border-border-strong bg-surface/60 text-center",
        compact ? "gap-2 px-5 py-8" : "gap-3 px-6 py-14",
        className
      )}
    >
      <span className={cn("flex items-center justify-center rounded-full bg-accent text-accent-foreground", compact ? "size-11" : "size-14")}>
        <Icon className={compact ? "size-5" : "size-6"} aria-hidden="true" />
      </span>
      <div className="max-w-sm space-y-1">
        <p className="text-lg font-semibold">{title}</p>
        {description && <p className="text-base text-muted-foreground">{description}</p>}
      </div>
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}
