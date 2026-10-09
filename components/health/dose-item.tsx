"use client";

import { useOptimistic, useTransition } from "react";
import { Check, CircleSlash, Clock, EllipsisVertical, RotateCcw, TriangleAlert } from "lucide-react";
import { toast } from "sonner";
import { logDose } from "@/app/actions/doses";
import { MemberAvatar } from "@/components/health/member-avatar";
import { RoleGate } from "@/components/health/role-gate";
import { StatusBadge } from "@/components/health/status-badge";
import { useAccess } from "@/components/providers/access-provider";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { formatTime } from "@/lib/dates";
import type { DoseState } from "@/lib/meds";
import { cn } from "@/lib/utils";

export type DoseItemData = {
  key: string;
  medicationId: string;
  memberId: string;
  name: string;
  strength: string;
  instructions: string | null;
  time: string;
  date: string;
  state: DoseState;
  loggedAtLabel: string | null;
  loggedByName: string | null;
};

const STATE_BADGE: Record<DoseState, { tone: "success" | "warning" | "danger" | "info" | "neutral"; label: string; icon: typeof Check }> = {
  taken: { tone: "success", label: "Taken", icon: Check },
  due: { tone: "info", label: "Due now", icon: Clock },
  missed: { tone: "danger", label: "Missed", icon: TriangleAlert },
  upcoming: { tone: "neutral", label: "Later", icon: Clock },
  skipped: { tone: "neutral", label: "Skipped", icon: CircleSlash },
};

export function DoseItem({
  dose,
  member,
}: {
  dose: DoseItemData;
  /** Shown on the family checklist so you know whose dose it is. */
  member?: { name: string; tone: number };
}) {
  const { can } = useAccess();
  const [pending, start] = useTransition();
  const [state, setOptimistic] = useOptimistic(dose.state);
  const allowed = can("doses.log", dose.memberId);
  const done = state === "taken";
  const label = `${dose.name} ${dose.strength}`.trim();

  const act = (status: "taken" | "skipped" | "undo") =>
    start(async () => {
      setOptimistic(status === "taken" ? "taken" : status === "skipped" ? "skipped" : dose.state === "taken" || dose.state === "skipped" ? "due" : dose.state);
      const res = await logDose({ medicationId: dose.medicationId, date: dose.date, time: dose.time, status });
      if (res.ok) {
        toast.success(res.message ?? "Saved", {
          action: status !== "undo" ? { label: "Undo", onClick: () => act("undo") } : undefined,
        });
      } else {
        toast.error(res.error);
      }
    });

  const badge = STATE_BADGE[state];

  return (
    <li
      className={cn(
        "flex items-center gap-3 rounded-xl border px-3 py-3 transition-colors duration-150 sm:gap-4 sm:px-4",
        done ? "border-success-border/70 bg-success-soft/50" : state === "missed" ? "border-danger-border/70 bg-card" : state === "due" ? "border-primary/40 bg-card" : "border-border bg-card"
      )}
    >
      <RoleGate action="doses.log" memberId={dose.memberId}>
        <button
          type="button"
          onClick={() => act(done ? "undo" : "taken")}
          disabled={pending || !allowed}
          aria-pressed={done}
          aria-label={done ? `Undo: ${label} at ${formatTime(dose.time)} was marked taken` : `Mark ${label} at ${formatTime(dose.time)} as taken`}
          className={cn(
            "flex size-12 shrink-0 cursor-pointer items-center justify-center rounded-full border-2 transition-[background-color,border-color,transform] duration-150 active:scale-95 disabled:cursor-not-allowed",
            done
              ? "border-success bg-success text-card"
              : state === "missed"
                ? "border-danger-border bg-card text-danger hover:bg-danger-soft"
                : "border-border-strong bg-card text-muted-foreground hover:border-primary hover:bg-accent hover:text-primary"
          )}
        >
          <Check className={cn("size-6 transition-opacity", done ? "opacity-100" : "opacity-40")} strokeWidth={2.5} aria-hidden="true" />
        </button>
      </RoleGate>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-baseline gap-x-2">
          <p className={cn("text-base font-semibold", done && "text-muted-foreground")}>{dose.name}</p>
          <p className="text-sm text-muted-foreground">{dose.strength}</p>
        </div>
        <p className="mt-0.5 truncate text-sm text-muted-foreground">
          {member && (
            <span className="mr-1.5 inline-flex items-center gap-1.5 align-middle font-medium text-foreground">
              <MemberAvatar name={member.name} tone={member.tone} size="sm" className="size-5 text-[0.625rem]" />
              {member.name.split(" ")[0]}
              <span aria-hidden="true" className="text-muted-foreground">·</span>
            </span>
          )}
          {done && dose.loggedAtLabel
            ? `Taken at ${dose.loggedAtLabel}${dose.loggedByName ? ` by ${dose.loggedByName}` : ""}`
            : dose.instructions ?? "As prescribed"}
        </p>
      </div>

      <div className="flex shrink-0 flex-col items-end gap-1.5">
        <span className="text-sm font-medium tabular">{formatTime(dose.time)}</span>
        <StatusBadge tone={badge.tone} label={badge.label} icon={badge.icon} size="sm" />
      </div>

      {allowed && (
        <DropdownMenu>
          <DropdownMenuTrigger
            aria-label={`More options for ${label} at ${formatTime(dose.time)}`}
            className="-mr-1 flex size-11 shrink-0 cursor-pointer items-center justify-center rounded-lg text-muted-foreground hover:bg-muted aria-expanded:bg-muted"
          >
            <EllipsisVertical className="size-5" aria-hidden="true" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-52">
            {!done && (
              <DropdownMenuItem onClick={() => act("taken")}>
                <Check aria-hidden="true" /> Mark taken
              </DropdownMenuItem>
            )}
            {state !== "skipped" && (
              <DropdownMenuItem onClick={() => act("skipped")}>
                <CircleSlash aria-hidden="true" /> Skip this dose
              </DropdownMenuItem>
            )}
            {(done || state === "skipped") && (
              <DropdownMenuItem onClick={() => act("undo")}>
                <RotateCcw aria-hidden="true" /> Undo
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </li>
  );
}
