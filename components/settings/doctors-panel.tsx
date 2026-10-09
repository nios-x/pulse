"use client";

import { useState, useTransition } from "react";
import { Link2, Stethoscope } from "lucide-react";
import { toast } from "sonner";
import { connectDoctor, revokeDoctorAccess } from "@/app/actions/doctor";
import { describedBy, Field } from "@/components/form/field";
import { Segmented } from "@/components/form/segmented";
import { MemberAvatar } from "@/components/health/member-avatar";
import { RoleGate } from "@/components/health/role-gate";
import { useAccess } from "@/components/providers/access-provider";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";

export type DoctorConnection = { id: string; doctor: string; specialty: string; memberId: string; memberName: string; tone: number; reason: string; until: string };

export function DoctorsPanel({ connections, members }: { connections: DoctorConnection[]; members: { id: string; name: string }[] }) {
  const { can } = useAccess();
  const allowed = members.filter((m) => can("sharing.manage", m.id));
  const [days, setDays] = useState("90");
  const [consent, setConsent] = useState(false);
  const [errors, setErrors] = useState<Record<string, string | undefined>>({});
  const [pending, start] = useTransition();
  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
      <section className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-5 shadow-soft sm:p-6">
        <div className="flex items-start gap-3">
          <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-accent-foreground"><Stethoscope className="size-5" aria-hidden="true" /></span>
          <div>
            <h3 className="font-heading text-lg font-bold">Connect your doctor</h3>
            <p className="text-[0.9375rem] text-muted-foreground">Ask your doctor for their Pulse code. They&apos;ll see this person&apos;s medicines, readings and records, and can leave notes for you.</p>
          </div>
        </div>
        <form
          action={(f) =>
            start(async () => {
              const res = await connectDoctor({ code: f.get("code"), memberId: f.get("memberId"), days, consent: consent ? "on" : "" });
              if (res.ok) { toast.success(res.message); setErrors({}); setConsent(false); }
              else { setErrors(res.fieldErrors ?? {}); toast.error(res.error); }
            })
          }
          className="flex flex-col gap-4"
        >
          <Field label="Doctor's code" htmlFor="dc-code" error={errors.code} hint="Try ANJ7DQ (Dr. Anjali) or FKH4ND (Dr. Farah)">
            <Input id="dc-code" name="code" maxLength={8} className="font-mono text-lg tracking-[0.3em] uppercase" {...describedBy("dc-code", errors.code, true)} />
          </Field>
          <Field label="Share whose information?" htmlFor="dc-member">
            <NativeSelect id="dc-member" name="memberId">
              {allowed.map((m) => <NativeSelectOption key={m.id} value={m.id}>{m.name}</NativeSelectOption>)}
            </NativeSelect>
          </Field>
          <fieldset>
            <legend className="mb-2 text-[0.9375rem] font-medium">For how long</legend>
            <Segmented name="days" label="For how long" value={days} onChange={setDays} options={[{ value: "30", label: "1 month" }, { value: "90", label: "3 months" }, { value: "180", label: "6 months" }, { value: "365", label: "1 year" }]} />
          </fieldset>
          <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-border bg-surface p-3.5 text-[0.9375rem] leading-snug">
            <Checkbox checked={consent} onCheckedChange={(v) => setConsent(Boolean(v))} className="mt-0.5" />
            <span>I have this person&apos;s consent (or I&apos;m their guardian) to share their health information with this doctor.</span>
          </label>
          <RoleGate action="sharing.manage">
            <Button type="submit" disabled={pending || !consent || !allowed.length}><Link2 aria-hidden="true" /> {pending ? "Connecting…" : "Connect doctor"}</Button>
          </RoleGate>
        </form>
      </section>
      <section className="flex flex-col gap-3">
        <h3 className="font-heading text-lg font-bold">Doctors who can see your family&apos;s data</h3>
        {connections.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-border-strong p-8 text-center text-base text-muted-foreground">No doctors connected.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {connections.map((c) => (
              <li key={c.id} className="flex flex-wrap items-center gap-3 rounded-2xl border border-border bg-card p-4 shadow-soft">
                <span className="flex size-10 items-center justify-center rounded-full bg-brand-soft text-accent-foreground"><Stethoscope className="size-5" aria-hidden="true" /></span>
                <div className="min-w-0 flex-1">
                  <p className="text-base font-semibold">{c.doctor} <span className="font-normal text-muted-foreground">· {c.specialty}</span></p>
                  <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
                    <MemberAvatar name={c.memberName} tone={c.tone} size="sm" className="size-5 text-[0.625rem]" /> {c.memberName} · {c.reason === "booking" ? "for an appointment" : "connected"} · until {c.until}
                  </p>
                </div>
                {can("sharing.manage", c.memberId) && (
                  <Button variant="destructive-outline" size="sm" disabled={pending} onClick={() => start(async () => { const r = await revokeDoctorAccess(c.id); if (r.ok) toast.success(r.message); else toast.error(r.error); })}>Remove access</Button>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
