import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

/** A friendly blank: what goes here, and the one thing to do about it. */
export function EmptyState({
  icon: Icon,
  title,
  body,
  action,
  className,
}: {
  icon: LucideIcon;
  title: string;
  body?: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center gap-3 rounded-2xl border border-dashed border-edge-strong px-6 py-10 text-center",
        className
      )}
    >
      <span className="well flex size-14 items-center justify-center rounded-2xl">
        <Icon className="size-7 text-sage" aria-hidden />
      </span>
      <div className="flex max-w-sm flex-col gap-1">
        <p className="text-lg font-semibold">{title}</p>
        {body ? <p className="text-base text-ink-2">{body}</p> : null}
      </div>
      {action ? <div className="mt-1">{action}</div> : null}
    </div>
  );
}
