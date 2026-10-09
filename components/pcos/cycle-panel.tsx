"use client";

import { useState, useTransition } from "react";
import { Bar, BarChart, CartesianGrid, ReferenceArea, Tooltip, XAxis, YAxis } from "recharts";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { deleteCycle, logCycle } from "@/app/actions/pcos";
import { Field } from "@/components/form/field";
import { Segmented } from "@/components/form/segmented";
import { useAccess } from "@/components/providers/access-provider";
import { Button } from "@/components/ui/button";
import { ChartContainer } from "@/components/ui/chart";
import { Input } from "@/components/ui/input";

const fmt = new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", timeZone: "UTC" });
const d = (s: string) => fmt.format(new Date(`${s}T00:00:00Z`));

export function CycleForm({ memberId, today }: { memberId: string; today: string }) {
  const { can } = useAccess();
  const [flow, setFlow] = useState<"light" | "medium" | "heavy">("medium");
  const [errors, setErrors] = useState<Record<string, string | undefined>>({});
  const [pending, start] = useTransition();
  return (
    <form
      action={(f) =>
        start(async () => {
          const res = await logCycle({ memberId, startDate: f.get("startDate"), endDate: f.get("endDate"), flow, notes: f.get("notes") || undefined });
          if (res.ok) { toast.success(res.message); setErrors({}); }
          else { setErrors(res.fieldErrors ?? {}); toast.error(res.error); }
        })
      }
      className="grid gap-4 sm:grid-cols-2"
    >
      <Field label="Period started" htmlFor="c-start" error={errors.startDate}><Input id="c-start" name="startDate" type="date" max={today} defaultValue={today} required /></Field>
      <Field label="Period ended" htmlFor="c-end" optional error={errors.endDate}><Input id="c-end" name="endDate" type="date" max={today} /></Field>
      <fieldset className="sm:col-span-2">
        <legend className="mb-2 text-[0.9375rem] font-medium">Flow</legend>
        <Segmented name="flow" label="Flow" value={flow} onChange={setFlow} options={[{ value: "light", label: "Light" }, { value: "medium", label: "Medium" }, { value: "heavy", label: "Heavy" }]} />
      </fieldset>
      <Field label="Notes" htmlFor="c-notes" optional className="sm:col-span-2"><Input id="c-notes" name="notes" placeholder="e.g. cramps on day 1" maxLength={300} /></Field>
      <Button type="submit" className="w-fit" disabled={pending || !can("vitals.log", memberId)}>{pending ? "Saving…" : "Log period"}</Button>
    </form>
  );
}

export function CycleChart({ cycles }: { cycles: { start: string; length: number }[] }) {
  if (cycles.length === 0) return <p className="py-8 text-center text-base text-muted-foreground">Log two periods to see your cycle lengths.</p>;
  return (
    <>
      <p className="sr-only">Cycle lengths: {cycles.map((c) => `${c.length} days from ${d(c.start)}`).join(", ")}.</p>
      <ChartContainer config={{ length: { label: "Cycle length", color: "var(--fruit-grape)" } }} className="aspect-auto h-56 w-full" aria-hidden="true">
        <BarChart data={cycles.map((c) => ({ label: d(c.start), length: c.length }))} margin={{ top: 8, right: 8, left: -14, bottom: 0 }}>
          <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="var(--border)" />
          <ReferenceArea y1={21} y2={35} fill="var(--chart-band)" stroke="none" />
          <XAxis dataKey="label" tickLine={false} axisLine={false} fontSize={12} />
          <YAxis tickLine={false} axisLine={false} fontSize={12} width={40} domain={[0, (max: number) => Math.max(45, max + 5)]} />
          <Tooltip cursor={{ fill: "var(--muted)" }} content={({ active, payload }) => (active && payload?.length ? <div className="rounded-xl border border-border bg-popover px-3 py-2 text-sm shadow-pop">{(payload[0].payload as { label: string }).label}: <b>{payload[0].value} days</b></div> : null)} />
          <Bar dataKey="length" fill="var(--color-length)" radius={[8, 8, 0, 0]} isAnimationActive={false} />
        </BarChart>
      </ChartContainer>
      <p className="text-sm text-muted-foreground">Shaded: 21–35 days, the usual range. Everybody&apos;s rhythm is different.</p>
    </>
  );
}

export function CycleHistory({ cycles, memberId }: { cycles: { id: string; startDate: string; endDate: string | null; flow: string; length: number | null }[]; memberId: string }) {
  const { can } = useAccess();
  const [pending, start] = useTransition();
  return (
    <ul className="divide-y divide-border">
      {cycles.map((c) => (
        <li key={c.id} className="flex items-center justify-between gap-3 py-3">
          <span>
            <span className="block text-base font-medium">{d(c.startDate)}{c.endDate ? ` – ${d(c.endDate)}` : ""}</span>
            <span className="text-sm text-muted-foreground">{c.flow[0].toUpperCase() + c.flow.slice(1)} flow{c.length ? ` · ${c.length}-day cycle` : " · current cycle"}</span>
          </span>
          {can("vitals.log", memberId) && (
            <Button variant="ghost" size="icon-sm" aria-label={`Remove period starting ${d(c.startDate)}`} disabled={pending} onClick={() => start(async () => { const r = await deleteCycle(c.id); if (r.ok) toast.success(r.message); else toast.error(r.error); })}>
              <Trash2 aria-hidden="true" />
            </Button>
          )}
        </li>
      ))}
    </ul>
  );
}
