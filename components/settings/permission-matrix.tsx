"use client";

import { useOptimistic, useTransition } from "react";
import { Check, Lock, RotateCcw, X } from "lucide-react";
import { toast } from "sonner";
import { resetPermissions, togglePermission } from "@/app/actions/family";
import { ROLE_ICON } from "@/components/health/role-badge";
import { useAccess } from "@/components/providers/access-provider";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { Role } from "@/db/schema";
import { ACTIONS, canToggle, ROLE_LABEL, ROLES, type Action } from "@/lib/permissions";
import { cn } from "@/lib/utils";

const SCOPE: Record<Role, string> = {
  admin: "Everyone",
  caregiver: "Assigned people",
  member: "Own profile",
  viewer: "Everyone (read-only)",
};

export function PermissionMatrix({ matrix }: { matrix: Record<Role, Record<Action, boolean>> }) {
  const { can, reason } = useAccess();
  const editable = can("family.manage");
  const [pending, start] = useTransition();
  const [state, apply] = useOptimistic(matrix, (cur, p: { role: Role; action: Action; allowed: boolean }) => ({
    ...cur,
    [p.role]: { ...cur[p.role], [p.action]: p.allowed },
  }));

  const toggle = (role: Role, action: Action, allowed: boolean) =>
    start(async () => {
      apply({ role, action, allowed });
      const res = await togglePermission({ role, action, allowed });
      if (res.ok) toast.success(res.message, { description: "Try it with the View as switcher at the top." });
      else toast.error(res.error);
    });

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <p className="max-w-2xl text-[0.9375rem] text-muted-foreground">
          Choose what each role can do. Changes apply immediately, on the server as well as on screen. The admin row and family management are locked so nobody gets locked out.
        </p>
        {editable && (
          <Button variant="outline" size="sm" disabled={pending} onClick={() => start(async () => { const r = await resetPermissions(); if (r.ok) toast.success(r.message); else toast.error(r.error); })}>
            <RotateCcw aria-hidden="true" /> Reset to defaults
          </Button>
        )}
      </div>
      {!editable && <p className="rounded-lg border border-border bg-surface px-4 py-3 text-[0.9375rem]">{reason("family.manage")}</p>}

      <div className="overflow-x-auto rounded-xl border border-border bg-card">
        <table className="w-full min-w-[44rem] border-collapse text-left">
          <caption className="sr-only">Permissions by role. Each cell says whether the role can do the action.</caption>
          <thead>
            <tr className="border-b border-border">
              <th scope="col" className="sticky left-0 z-10 w-[40%] bg-card px-4 py-3 text-sm font-medium text-muted-foreground">Action</th>
              {ROLES.map((r) => {
                const Icon = ROLE_ICON[r];
                return (
                  <th key={r} scope="col" className="px-3 py-3 text-center">
                    <span className="flex flex-col items-center gap-1">
                      <span className="inline-flex items-center gap-1.5 text-[0.9375rem] font-semibold"><Icon className="size-4 text-muted-foreground" aria-hidden="true" />{ROLE_LABEL[r]}</span>
                      <span className="text-xs font-normal text-muted-foreground">{SCOPE[r]}</span>
                    </span>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {ACTIONS.map((a) => (
              <tr key={a.key} className="hover:bg-muted/40">
                <th scope="row" className="sticky left-0 z-10 bg-card px-4 py-3 font-normal">
                  <span className="block text-[0.9375rem] font-medium">{a.label}</span>
                  <span className="block text-sm text-muted-foreground">{a.description}</span>
                </th>
                {ROLES.map((r) => {
                  const on = state[r][a.key];
                  const toggleable = canToggle(r, a.key);
                  const label = `${ROLE_LABEL[r]}: ${a.label}`;
                  return (
                    <td key={r} className="px-3 py-3 text-center">
                      {toggleable && editable ? (
                        <span className="inline-flex flex-col items-center gap-1">
                          <Switch checked={on} disabled={pending} onCheckedChange={(v) => toggle(r, a.key, v)} aria-label={label} />
                          <span className={cn("text-xs font-medium", on ? "text-success" : "text-muted-foreground")}>{on ? "Allowed" : "Off"}</span>
                        </span>
                      ) : (
                        <Tooltip>
                          <TooltipTrigger
                            render={<span tabIndex={0} aria-label={`${label}: ${on ? "allowed" : "not allowed"}${!toggleable ? " (locked)" : ""}`} className="inline-flex min-h-11 min-w-11 cursor-help flex-col items-center justify-center gap-1 rounded-md" />}
                          >
                            <span className={cn("inline-flex size-7 items-center justify-center rounded-full", on ? "bg-success-soft text-success" : "bg-muted text-muted-foreground")}>
                              {on ? <Check className="size-4" aria-hidden="true" /> : <X className="size-4" aria-hidden="true" />}
                            </span>
                            {!toggleable && <Lock className="size-3 text-muted-foreground" aria-hidden="true" />}
                          </TooltipTrigger>
                          <TooltipContent className="max-w-60 text-sm">
                            {!toggleable
                              ? r === "admin"
                                ? "Admins always have full control."
                                : a.key === "family.manage"
                                  ? "Only admins can manage family and roles."
                                  : "Viewers are always read-only."
                              : reason("family.manage")}
                          </TooltipContent>
                        </Tooltip>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
