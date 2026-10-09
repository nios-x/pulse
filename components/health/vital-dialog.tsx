"use client";

import { useState, useTransition } from "react";
import { Activity, Droplet, HeartPulse, Plus, Scale, Thermometer, Wind } from "lucide-react";
import { toast } from "sonner";
import { addVital } from "@/app/actions/vitals";
import { describedBy, Field } from "@/components/form/field";
import { Segmented } from "@/components/form/segmented";
import { SafetyNote } from "@/components/health/safety-note";
import { useAccess } from "@/components/providers/access-provider";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import type { VitalKind } from "@/db/schema";
import { VITAL_META } from "@/lib/vitals";

const KINDS: { value: VitalKind; label: string; icon: typeof Activity }[] = [
  { value: "bp", label: "BP", icon: HeartPulse },
  { value: "sugar", label: "Sugar", icon: Droplet },
  { value: "weight", label: "Weight", icon: Scale },
  { value: "pulse", label: "Pulse", icon: Activity },
  { value: "spo2", label: "Oxygen", icon: Wind },
  { value: "temperature", label: "Temp", icon: Thermometer },
];

export function VitalDialog({
  members,
  defaultMemberId,
  defaultKind = "bp",
  trigger,
}: {
  members: { id: string; name: string }[];
  defaultMemberId?: string;
  defaultKind?: VitalKind;
  trigger?: React.ReactElement;
}) {
  const { can } = useAccess();
  const allowedMembers = members.filter((m) => can("vitals.log", m.id));
  const [open, setOpen] = useState(false);
  const [memberId, setMemberId] = useState(defaultMemberId && allowedMembers.some((m) => m.id === defaultMemberId) ? defaultMemberId : allowedMembers[0]?.id ?? "");
  const [kind, setKind] = useState<VitalKind>(defaultKind);
  const [context, setContext] = useState<"fasting" | "after_meal" | "random">("fasting");
  const [errors, setErrors] = useState<Record<string, string | undefined>>({});
  const [pending, start] = useTransition();
  const meta = VITAL_META[kind];

  const submit = (form: FormData) =>
    start(async () => {
      const res = await addVital({
        memberId,
        kind,
        value: form.get("value"),
        value2: kind === "bp" ? form.get("value2") : undefined,
        context: kind === "sugar" ? context : undefined,
        note: form.get("note") || undefined,
      });
      if (res.ok) {
        setErrors({});
        setOpen(false);
        if (res.data?.status === "normal") toast.success(res.message);
        else toast.warning(res.message, { description: "Recheck after resting for 5 minutes. Not a diagnosis. Consult a doctor." });
      } else {
        setErrors(res.fieldErrors ?? {});
        toast.error(res.error);
      }
    });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        disabled={allowedMembers.length === 0}
        render={
          trigger ?? (
            <Button>
              <Plus aria-hidden="true" /> Record a reading
            </Button>
          )
        }
      />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Record a reading</DialogTitle>
          <DialogDescription>Write down a number from your BP machine, glucometer, scale or thermometer.</DialogDescription>
        </DialogHeader>
        <form action={submit} className="flex flex-col gap-5">
          <Field label="Who is this for?" htmlFor="vital-member">
            <NativeSelect id="vital-member" value={memberId} onChange={(e) => setMemberId(e.target.value)}>
              {allowedMembers.map((m) => (
                <NativeSelectOption key={m.id} value={m.id}>
                  {m.name}
                </NativeSelectOption>
              ))}
            </NativeSelect>
          </Field>
          <fieldset className="flex flex-col gap-2">
            <legend className="mb-2 text-[0.9375rem] font-medium">What did you measure?</legend>
            <Segmented name="kind" label="Reading type" value={kind} onChange={(v) => { setKind(v); setErrors({}); }} options={KINDS} />
          </fieldset>
          {kind === "bp" ? (
            <div className="grid grid-cols-2 gap-3">
              <Field label="Top number" htmlFor="vital-value" error={errors.value} hint="Systolic">
                <Input id="vital-value" name="value" inputMode="numeric" placeholder="120" required {...describedBy("vital-value", errors.value, true)} />
              </Field>
              <Field label="Bottom number" htmlFor="vital-value2" error={errors.value2} hint="Diastolic">
                <Input id="vital-value2" name="value2" inputMode="numeric" placeholder="80" required {...describedBy("vital-value2", errors.value2, true)} />
              </Field>
            </div>
          ) : (
            <Field label={`${meta.label} (${meta.unit})`} htmlFor="vital-value" error={errors.value}>
              <Input id="vital-value" name="value" inputMode="decimal" required placeholder={kind === "sugar" ? "110" : kind === "weight" ? "68.5" : kind === "temperature" ? "98.6" : kind === "spo2" ? "98" : "72"} {...describedBy("vital-value", errors.value)} />
            </Field>
          )}
          {kind === "sugar" && (
            <fieldset>
              <legend className="mb-2 text-[0.9375rem] font-medium">When was it taken?</legend>
              <Segmented
                name="context"
                label="When was it taken"
                value={context}
                onChange={setContext}
                options={[
                  { value: "fasting", label: "Fasting" },
                  { value: "after_meal", label: "After a meal" },
                  { value: "random", label: "Any time" },
                ]}
              />
            </fieldset>
          )}
          <Field label="Note" htmlFor="vital-note" optional>
            <Input id="vital-note" name="note" placeholder="e.g. after evening walk" maxLength={200} />
          </Field>
          <SafetyNote>We label readings as normal, high or low using general ranges. Not a diagnosis. Consult a doctor.</SafetyNote>
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={pending || !memberId}>
              {pending ? "Saving…" : "Save reading"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
