"use client";

import { useTransition } from "react";
import { ChevronDown, Eye } from "lucide-react";
import { toast } from "sonner";
import { setViewAs } from "@/app/actions/session";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ROLE_ICON } from "@/components/health/role-badge";
import type { Role } from "@/db/schema";
import { ROLE_LABEL, ROLE_SUMMARY, ROLES } from "@/lib/permissions";
import { cn } from "@/lib/utils";

/** Demo-only switcher so judges can watch permissions change live. Admins only. */
export function ViewAsSwitcher({ current, className }: { current: Role; className?: string }) {
  const [pending, start] = useTransition();
  const choose = (value: string) =>
    start(async () => {
      await setViewAs(value === "admin" ? null : value);
      toast.success(value === "admin" ? "Back to your own view (Admin)" : `Now viewing as ${ROLE_LABEL[value as Role]}`, {
        description: value === "admin" ? undefined : ROLE_SUMMARY[value as Role],
      });
    });
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label={`Demo: view as another role. Currently ${ROLE_LABEL[current]}`}
        className={cn(
          "inline-flex h-11 cursor-pointer items-center gap-2 rounded-lg border border-dashed border-border-strong bg-card px-3 text-sm font-medium transition-colors hover:bg-muted aria-expanded:bg-muted",
          pending && "opacity-60",
          className
        )}
      >
        <Eye className="size-4 text-muted-foreground" aria-hidden="true" />
        <span className="text-muted-foreground">View as</span>
        <span>{ROLE_LABEL[current]}</span>
        <ChevronDown className="size-4 text-muted-foreground" aria-hidden="true" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <DropdownMenuGroup>
          <DropdownMenuLabel>Demo: preview the app as</DropdownMenuLabel>
          <DropdownMenuRadioGroup value={current} onValueChange={choose}>
            {ROLES.map((role) => {
              const Icon = ROLE_ICON[role];
              return (
                <DropdownMenuRadioItem key={role} value={role} className="items-start py-2.5">
                  <Icon className="mt-0.5 size-5 text-muted-foreground" aria-hidden="true" />
                  <span className="flex flex-col gap-0.5">
                    <span className="font-medium">{ROLE_LABEL[role]}{role === "admin" ? " (you)" : ""}</span>
                    <span className="text-sm leading-snug whitespace-normal text-muted-foreground">{ROLE_SUMMARY[role]}</span>
                  </span>
                </DropdownMenuRadioItem>
              );
            })}
          </DropdownMenuRadioGroup>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
