"use client";

import { useState, useTransition } from "react";
import { NotebookPen } from "lucide-react";
import { toast } from "sonner";
import { saveDoctorNote } from "@/app/actions/doctor";
import { Field } from "@/components/form/field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

export function NoteForm({ memberId, appointmentId }: { memberId: string; appointmentId?: string }) {
  const [errors, setErrors] = useState<Record<string, string | undefined>>({});
  const [pending, start] = useTransition();
  return (
    <form
      action={(f) =>
        start(async () => {
          const res = await saveDoctorNote({ memberId, appointmentId, summary: f.get("summary"), advice: f.get("advice") || undefined, followUpOn: f.get("followUpOn") || "" });
          if (res.ok) { toast.success(res.message); setErrors({}); (document.getElementById("note-form") as HTMLFormElement)?.reset(); }
          else { setErrors(res.fieldErrors ?? {}); toast.error(res.error); }
        })
      }
      id="note-form"
      className="flex flex-col gap-4"
    >
      <Field label="Visit summary" htmlFor="n-summary" error={errors.summary}><Textarea id="n-summary" name="summary" required placeholder="What you found today" /></Field>
      <Field label="Advice for the family" htmlFor="n-advice" optional hint="Shown to the family in plain words"><Textarea id="n-advice" name="advice" placeholder="e.g. Walk 20 minutes after dinner; recheck BP in 2 weeks" /></Field>
      <Field label="Follow-up on" htmlFor="n-follow" optional><Input id="n-follow" name="followUpOn" type="date" /></Field>
      <Button type="submit" className="w-fit" disabled={pending}><NotebookPen aria-hidden="true" /> {pending ? "Saving…" : appointmentId ? "Save note and mark seen" : "Save note"}</Button>
    </form>
  );
}
