"use client";

import { ShieldCheckIcon } from "lucide-react";
import { useT } from "@/components/i18n-provider";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { AppRole } from "@/lib/roles";
import { cn } from "@/lib/utils";

/** "Admin" in the header, with what that means one hover or focus away. */
export function RoleBadge({ role, previewing, className }: { role: AppRole; previewing: boolean; className?: string }) {
  const t = useT();
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <button
            type="button"
            className={cn(
              "inline-flex h-9 items-center gap-1.5 rounded-full px-3 text-sm font-semibold ring-1 ring-inset",
              previewing ? "bg-sage text-primary-foreground ring-sage" : "bg-sheet text-sage-deep ring-sage/30",
              className
            )}
          />
        }
      >
        <ShieldCheckIcon className="size-4" aria-hidden />
        {t(`approle.${role}`)}
        <span className="sr-only">. {t(`approle.${role}.about`)}</span>
      </TooltipTrigger>
      <TooltipContent className="max-w-64 px-3 py-2 text-sm leading-snug">
        {previewing ? `${t("viewAs.previewNote")} ` : ""}
        {t(`approle.${role}.about`)}
      </TooltipContent>
    </Tooltip>
  );
}
