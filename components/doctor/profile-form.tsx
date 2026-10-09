"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { updateDoctorProfile } from "@/app/actions/doctor";
import { Field } from "@/components/form/field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

type Profile = { specialty: string; clinic: string; city: string; phone: string | null; fee: number; languages: string[]; teleconsult: boolean; slotMinutes: number; bio: string | null; hours: Record<string, [string, string] | null> };

export function DoctorProfileForm({ initial }: { initial: Profile }) {
  const [p, setP] = useState(initial);
  const [langs, setLangs] = useState(initial.languages.join(", "));
  const [pending, start] = useTransition();
  const set = <K extends keyof Profile>(k: K, v: Profile[K]) => setP((s) => ({ ...s, [k]: v }));
  const save = () =>
    start(async () => {
      const res = await updateDoctorProfile({ ...p, phone: p.phone ?? "", bio: p.bio ?? "", languages: langs.split(",").map((l) => l.trim()).filter(Boolean) });
      if (res.ok) toast.success(res.message);
      else toast.error(res.error);
    });
  return (
    <form action={save} className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      <section className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-5 shadow-soft sm:p-6">
        <h2 className="font-heading text-lg font-bold">Profile</h2>
        <Field label="Speciality" htmlFor="d-spec"><Input id="d-spec" value={p.specialty} onChange={(e) => set("specialty", e.target.value)} /></Field>
        <Field label="Clinic or hospital" htmlFor="d-clinic"><Input id="d-clinic" value={p.clinic} onChange={(e) => set("clinic", e.target.value)} /></Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="City" htmlFor="d-city"><Input id="d-city" value={p.city} onChange={(e) => set("city", e.target.value)} /></Field>
          <Field label="Clinic phone" htmlFor="d-phone" optional><Input id="d-phone" type="tel" value={p.phone ?? ""} onChange={(e) => set("phone", e.target.value)} /></Field>
          <Field label="Consultation fee (₹)" htmlFor="d-fee"><Input id="d-fee" inputMode="numeric" value={p.fee} onChange={(e) => set("fee", Number(e.target.value) || 0)} /></Field>
          <Field label="Minutes per slot" htmlFor="d-slot"><Input id="d-slot" inputMode="numeric" value={p.slotMinutes} onChange={(e) => set("slotMinutes", Number(e.target.value) || 15)} /></Field>
        </div>
        <Field label="Languages" htmlFor="d-lang" hint="Separate with commas"><Input id="d-lang" value={langs} onChange={(e) => setLangs(e.target.value)} /></Field>
        <Field label="About you" htmlFor="d-bio" optional><Textarea id="d-bio" value={p.bio ?? ""} onChange={(e) => set("bio", e.target.value)} maxLength={400} /></Field>
        <label className="flex items-center justify-between gap-3 rounded-xl border border-border p-3.5 text-base">
          Offer video consults
          <Switch checked={p.teleconsult} onCheckedChange={(v) => set("teleconsult", v)} aria-label="Offer video consults" />
        </label>
      </section>
      <section className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-5 shadow-soft sm:p-6">
        <h2 className="font-heading text-lg font-bold">Weekly hours</h2>
        <p className="text-sm text-muted-foreground">Families can book slots inside these hours. Booked slots are blocked automatically.</p>
        <ul className="flex flex-col gap-2">
          {DAYS.map((d, i) => {
            const h = p.hours[String(i)];
            return (
              <li key={d} className="flex flex-wrap items-center gap-3 rounded-xl bg-surface px-3 py-2">
                <Switch checked={Boolean(h)} onCheckedChange={(on) => set("hours", { ...p.hours, [String(i)]: on ? ["10:00", "13:00"] : null })} aria-label={`Open on ${d}`} />
                <span className="w-24 text-[0.9375rem] font-medium">{d}</span>
                {h ? (
                  <span className="flex items-center gap-2">
                    <Input type="time" aria-label={`${d} opens`} value={h[0]} onChange={(e) => set("hours", { ...p.hours, [String(i)]: [e.target.value, h[1]] })} className="h-10 w-32" />
                    <span aria-hidden="true">–</span>
                    <Input type="time" aria-label={`${d} closes`} value={h[1]} onChange={(e) => set("hours", { ...p.hours, [String(i)]: [h[0], e.target.value] })} className="h-10 w-32" />
                  </span>
                ) : (
                  <span className="text-sm text-muted-foreground">Closed</span>
                )}
              </li>
            );
          })}
        </ul>
        <Button type="submit" size="lg" className="mt-2 w-fit" disabled={pending}>{pending ? "Saving…" : "Save profile and hours"}</Button>
      </section>
    </form>
  );
}
