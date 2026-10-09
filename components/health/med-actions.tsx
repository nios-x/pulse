"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { EllipsisVertical, Pause, Pencil, Play, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { addRefill, deleteMedication, setMedicationActive } from "@/app/actions/medications";
import { RoleGate } from "@/components/health/role-gate";
import { useAccess } from "@/components/providers/access-provider";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";

export function MedActions({ id, memberId, name, active }: { id: string; memberId: string; name: string; active: boolean }) {
  const { can } = useAccess();
  const [pending, start] = useTransition();
  const [refillOpen, setRefillOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const run = (fn: () => Promise<{ ok: boolean; message?: string; error?: string }>, after?: () => void) =>
    start(async () => {
      const res = await fn();
      if (res.ok) {
        toast.success(res.message ?? "Saved");
        after?.();
      } else toast.error(res.error);
    });

  if (!can("meds.manage", memberId)) {
    return (
      <RoleGate action="meds.manage" memberId={memberId}>
        <Button variant="ghost" size="icon-sm" aria-label={`Edit ${name}`}>
          <Pencil aria-hidden="true" />
        </Button>
      </RoleGate>
    );
  }

  return (
    <div className="flex items-center gap-1.5">
      <DropdownMenu>
        <DropdownMenuTrigger aria-label={`More options for ${name}`} className="flex size-10 cursor-pointer items-center justify-center rounded-lg text-muted-foreground hover:bg-muted aria-expanded:bg-muted" disabled={pending}>
          <EllipsisVertical className="size-5" aria-hidden="true" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          {active && (
            <DropdownMenuItem onClick={() => setRefillOpen(true)}>
              <Plus aria-hidden="true" /> Add a refill
            </DropdownMenuItem>
          )}
          <DropdownMenuItem render={<Link href={`/medications/${id}/edit`} />}>
            <Pencil aria-hidden="true" /> Edit schedule
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => run(() => setMedicationActive(id, !active))}>
            {active ? <Pause aria-hidden="true" /> : <Play aria-hidden="true" />} {active ? "Stop this medicine" : "Restart"}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem variant="destructive" onClick={() => setConfirmDelete(true)}>
            <Trash2 aria-hidden="true" /> Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={refillOpen} onOpenChange={setRefillOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add a refill</DialogTitle>
            <DialogDescription>How many {name} tablets did you buy?</DialogDescription>
          </DialogHeader>
          <form
            action={(f) => run(() => addRefill({ id, add: f.get("add") }), () => setRefillOpen(false))}
            className="flex flex-col gap-4"
          >
            <label htmlFor={`refill-${id}`} className="sr-only">Number of tablets</label>
            <Input id={`refill-${id}`} name="add" inputMode="numeric" defaultValue={30} required />
            <div className="flex flex-wrap gap-2">
              {[10, 15, 30, 60, 90].map((n) => (
                <Button key={n} type="button" variant="outline" size="sm" onClick={(e) => ((e.currentTarget.form!.elements.namedItem("add") as HTMLInputElement).value = String(n))}>
                  {n}
                </Button>
              ))}
            </div>
            <Button type="submit" disabled={pending}>Save refill</Button>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete {name}?</DialogTitle>
            <DialogDescription>This also deletes its dose history. To keep the history, stop the medicine instead.</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button variant="outline" onClick={() => setConfirmDelete(false)}>Keep it</Button>
            <Button variant="destructive" disabled={pending} onClick={() => run(() => deleteMedication(id), () => setConfirmDelete(false))}>
              Delete
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
