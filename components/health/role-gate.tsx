"use client";

import { Lock } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useAccess } from "@/components/providers/access-provider";
import type { Action } from "@/lib/permissions";
import { cn } from "@/lib/utils";

/**
 * Shows its children when the current role may perform `action`.
 * Otherwise hides them (mode="hide") or shows them disabled with a tooltip
 * explaining why (mode="disable", the default). The server enforces the same rule.
 */
export function RoleGate({
  action,
  memberId,
  mode = "disable",
  children,
  className,
}: {
  action: Action;
  memberId?: string | null;
  mode?: "disable" | "hide";
  children: React.ReactNode;
  className?: string;
}) {
  const { can, reason } = useAccess();
  if (can(action, memberId)) return <>{children}</>;
  if (mode === "hide") return null;
  const why = reason(action, memberId) ?? "You don't have access to this.";
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <span
            tabIndex={0}
            role="group"
            aria-disabled="true"
            aria-label={`Not available: ${why}`}
            className={cn("relative inline-flex cursor-not-allowed rounded-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring", className)}
          />
        }
      >
        <span inert className="pointer-events-none inline-flex w-full opacity-50 grayscale-[30%]">
          {children}
        </span>
        <span className="absolute -top-1.5 -right-1.5 flex size-5 items-center justify-center rounded-full border border-border bg-card text-muted-foreground shadow-soft">
          <Lock className="size-3" aria-hidden="true" />
        </span>
      </TooltipTrigger>
      <TooltipContent className="max-w-64 text-sm leading-snug">{why}</TooltipContent>
    </Tooltip>
  );
}
