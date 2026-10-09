import type { LucideIcon } from "lucide-react";
import { Illustration, type IllustrationName } from "@/components/brand/illustration";
import { cn } from "@/lib/utils";

export function EmptyState({
  icon: Icon,
  illustration,
  title,
  description,
  action,
  className,
  compact = false,
}: {
  icon: LucideIcon;
  /** Replaces the icon on full-size first-run states. Leave it off compact, filtered and permission states. */
  illustration?: IllustrationName;
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
        compact ? "gap-2 px-5 py-8" : illustration ? "gap-3 px-6 pt-8 pb-14" : "gap-3 px-6 py-14",
        className
      )}
    >
      {illustration ? (
        <Illustration name={illustration} className="max-w-60 sm:max-w-72" />
      ) : (
        <span className={cn("flex items-center justify-center rounded-full bg-accent text-accent-foreground", compact ? "size-11" : "size-14")}>
          <Icon className={compact ? "size-5" : "size-6"} aria-hidden="true" />
        </span>
      )}
      <div className="max-w-sm space-y-1">
        <p className="text-lg font-semibold">{title}</p>
        {description && <p className="text-base text-muted-foreground">{description}</p>}
      </div>
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}
