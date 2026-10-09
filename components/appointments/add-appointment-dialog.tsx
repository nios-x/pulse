"use client";

import { useState, useTransition } from "react";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { saveAppointment } from "@/app/actions/appointments";
import { describedBy, Field } from "@/components/form/field";
import { Segmented } from "@/components/form/segmented";
import { useAccess } from "@/components/providers/access-provider";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";

export function AddAppointmentDialog({ members, today }: { members: { id: string; name: string }[]; today: string }) {
  const { can } = useAccess();
  const allowed = members.filter((m) => can("appointments.manage", m.id));
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"in_person" | "video">("in_person");
  const [errors, setErrors] = useState<Record<string, string | undefined>>({});
  const [pending, start] = useTransition();
  const submit = (f: FormData) =>
    start(async () => {
      const res = await saveAppointment({ ...Object.fromEntries(f), mode });
      if (res.ok) { toast.success(res.message); setOpen(false); setErrors({}); }
      else { setErrors(res.fieldErrors ?? {}); toast.error(res.error); }
    });
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger disabled={!allowed.length} render={<Button variant="outline"><Plus aria-hidden="true" /> Add manually</Button>} />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add an appointment</DialogTitle>
          <DialogDescription>For a doctor or lab that isn&apos;t in our directory.</DialogDescription>
        </DialogHeader>
        <form action={submit} className="grid gap-4 sm:grid-cols-2">
          <Field label="Who is it for?" htmlFor="a-member" className="sm:col-span-2">
            <NativeSelect id="a-member" name="memberId">
              {allowed.map((m) => <NativeSelectOption key={m.id} value={m.id}>{m.name}</NativeSelectOption>)}
            </NativeSelect>
          </Field>
          <Field label="Doctor or clinic" htmlFor="a-doc" error={errors.doctorName}>
            <Input id="a-doc" name="doctorName" required {...describedBy("a-doc", errors.doctorName)} />
          </Field>
          <Field label="Speciality" htmlFor="a-spec" optional>
            <Input id="a-spec" name="specialty" placeholder="e.g. Dentist" />
          </Field>
          <Field label="Date" htmlFor="a-date" error={errors.date}>
            <Input id="a-date" name="date" type="date" min={today} defaultValue={today} required />
          </Field>
          <Field label="Time" htmlFor="a-time" error={errors.time}>
            <Input id="a-time" name="time" type="time" defaultValue="10:00" required />
          </Field>
          <fieldset className="sm:col-span-2">
            <legend className="mb-2 text-[0.9375rem] font-medium">Type</legend>
            <Segmented name="mode" label="Appointment type" value={mode} onChange={setMode} options={[{ value: "in_person", label: "In person" }, { value: "video", label: "Video consult" }]} />
          </fieldset>
          {mode === "in_person" && (
            <Field label="Location" htmlFor="a-loc" optional className="sm:col-span-2">
              <Input id="a-loc" name="location" placeholder="Clinic name and area" />
            </Field>
          )}
          <Field label="Reason" htmlFor="a-reason" optional className="sm:col-span-2">
            <Input id="a-reason" name="reason" placeholder="e.g. Eye check-up" />
          </Field>
          <Field label="Notes" htmlFor="a-notes" optional className="sm:col-span-2">
            <Textarea id="a-notes" name="notes" placeholder="What to bring, fasting needed, questions to ask" />
          </Field>
          <div className="flex flex-col-reverse gap-2 sm:col-span-2 sm:flex-row sm:justify-end">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={pending}>{pending ? "Saving…" : "Save appointment"}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
