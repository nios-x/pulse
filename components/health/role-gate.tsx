"use client";

import type { ReactNode } from "react";
import { LockIcon } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

/**
 * Shows an action when the role allows it. Otherwise the action stays visible
 * but inert, with a lock and a tooltip saying why, so people learn what their
 * role can do instead of wondering where a button went.
 */
export function RoleGate({
  allowed,
  reason,
  children,
  className,
}: {
  allowed: boolean;
  reason: string;
  children: ReactNode;
  className?: string;
}) {
  if (allowed) return <>{children}</>;
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <span
            tabIndex={0}
            role="group"
            aria-label={reason}
            className={cn("relative inline-flex rounded-xl outline-none focus-visible:ring-3 focus-visible:ring-ring/50", className)}
          />
        }
      >
        <span inert className="pointer-events-none flex w-full opacity-45 saturate-50 [&>*]:w-full">
          {children}
        </span>
        <span className="absolute -top-1.5 -right-1.5 flex size-6 items-center justify-center rounded-full border border-edge bg-sheet text-ink-2 shadow-sm">
          <LockIcon className="size-3.5" aria-hidden />
        </span>
      </TooltipTrigger>
      <TooltipContent className="max-w-64 px-3 py-2 text-sm leading-snug">{reason}</TooltipContent>
    </Tooltip>
  );
}

/** A whole panel the role can't use: says so plainly instead of rendering a dead form. */
export function LockedPanel({ title, reason, className }: { title: string; reason: string; className?: string }) {
  return (
    <div className={cn("flex items-start gap-3 rounded-2xl border border-dashed border-edge-strong px-4 py-4", className)}>
      <span className="well flex size-10 shrink-0 items-center justify-center rounded-xl">
        <LockIcon className="size-5 text-ink-2" aria-hidden />
      </span>
      <div>
        <p className="text-base font-semibold">{title}</p>
        <p className="text-base text-ink-2">{reason}</p>
      </div>
    </div>
  );
}
