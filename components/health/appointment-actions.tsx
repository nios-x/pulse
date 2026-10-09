"use client";

import { useTransition } from "react";
import { CalendarCheck, CalendarX, EllipsisVertical, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { setAppointmentStatus } from "@/app/actions/appointments";
import { useAccess } from "@/components/providers/access-provider";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

export function AppointmentActions({ id, memberId, status, label }: { id: string; memberId: string; status: string; label: string }) {
  const { can } = useAccess();
  const [pending, start] = useTransition();
  if (!can("appointments.manage", memberId)) return null;
  const set = (s: "scheduled" | "completed" | "cancelled") =>
    start(async () => {
      const res = await setAppointmentStatus(id, s);
      if (res.ok) toast.success(res.message);
      else toast.error(res.error);
    });
  return (
    <DropdownMenu>
      <DropdownMenuTrigger aria-label={`Options for ${label}`} disabled={pending} className="flex size-11 shrink-0 cursor-pointer items-center justify-center rounded-lg text-muted-foreground hover:bg-muted aria-expanded:bg-muted">
        <EllipsisVertical className="size-5" aria-hidden="true" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        {status === "scheduled" ? (
          <>
            <DropdownMenuItem onClick={() => set("completed")}>
              <CalendarCheck aria-hidden="true" /> Mark as done
            </DropdownMenuItem>
            <DropdownMenuItem variant="destructive" onClick={() => set("cancelled")}>
              <CalendarX aria-hidden="true" /> Cancel appointment
            </DropdownMenuItem>
          </>
        ) : (
          <DropdownMenuItem onClick={() => set("scheduled")}>
            <RotateCcw aria-hidden="true" /> Move back to upcoming
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
