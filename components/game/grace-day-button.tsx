"use client";

import { useState, useTransition } from "react";
import { Moon } from "lucide-react";
import { toast } from "sonner";
import { takeGraceDay } from "@/app/actions/habits";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { GRACE_REASONS } from "@/lib/pcos";

/** A kind "rest day": protects the streak when life happens. */
export function GraceDayButton({ memberId, taken }: { memberId: string; taken: boolean }) {
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  if (taken) {
    return (
      <span className="inline-flex h-10 items-center gap-2 rounded-xl bg-fruit-grape-soft px-3 text-sm font-medium text-fruit-grape">
        <Moon className="size-4" aria-hidden="true" /> Rest day: streak protected
      </span>
    );
  }
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="ghost" size="sm"><Moon aria-hidden="true" /> Take a rest day</Button>} />
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Take a rest day</DialogTitle>
          <DialogDescription>Your streak stays safe today. Up to 2 rest days a week, no guilt.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-2">
          {GRACE_REASONS.map((r) => (
            <Button
              key={r.key}
              variant="outline"
              className="justify-start"
              disabled={pending}
              onClick={() =>
                start(async () => {
                  const res = await takeGraceDay({ memberId, reason: r.key });
                  if (res.ok) { toast.success(res.message); setOpen(false); }
                  else toast.error(res.error);
                })
              }
            >
              {r.label}
            </Button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
