"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { BadgeIndianRupee, Clock, Plus, ShieldAlert, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { saveMedication } from "@/app/actions/medications";
import { describedBy, Field } from "@/components/form/field";
import { Segmented } from "@/components/form/segmented";
import { StatusBadge } from "@/components/health/status-badge";
import { useAccess } from "@/components/providers/access-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { Switch } from "@/components/ui/switch";
import { formatTime } from "@/lib/dates";
import { checkInteractions, genericAlternative, GENERIC_LABEL, searchDrugs } from "@/lib/drugs";
import { SCHEDULE_PRESETS, slotOf, SLOT_LABEL } from "@/lib/meds";
import { cn } from "@/lib/utils";

export type MedFormValues = {
  id?: string;
  memberId: string;
  name: string;
  genericName: string;
  strength: string;
  form: string;
  instructions: string;
  times: string[];
  startDate: string;
  endDate: string;
  pillsLeft: string;
  refillAt: string;
  prescribedBy: string;
};

const FORMS = ["tablet", "capsule", "chewable tablet", "syrup", "inhaler", "injection", "drops", "cream"];
const INSTRUCTIONS = ["After food", "Before food", "Empty stomach", "At bedtime", "With milk"];

export function MedicationForm({
  initial,
  members,
  existing,
}: {
  initial: MedFormValues;
  members: { id: string; name: string }[];
  /** Every member's current medicines, for the live clash check. */
  existing: { id: string; memberId: string; name: string; genericName: string | null }[];
}) {
  const router = useRouter();
  const { can } = useAccess();
  const allowed = members.filter((m) => can("meds.manage", m.id));
  const [v, setV] = useState<MedFormValues>({ ...initial, memberId: initial.memberId || allowed[0]?.id || "" });
  const [ongoing, setOngoing] = useState(!initial.endDate);
  const [errors, setErrors] = useState<Record<string, string | undefined>>({});
  const [showSuggest, setShowSuggest] = useState(false);
  const [pending, start] = useTransition();
  const set = <K extends keyof MedFormValues>(k: K, val: MedFormValues[K]) => setV((s) => ({ ...s, [k]: val }));

  const suggestions = showSuggest ? searchDrugs(v.name) : [];
  const preset = SCHEDULE_PRESETS.find((p) => p.times.join() === [...v.times].sort().join())?.key ?? "custom";

  const clashes = useMemo(() => {
    if (v.name.trim().length < 3) return { interactions: [], duplicates: [] };
    const others = existing.filter((m) => m.memberId === v.memberId && m.id !== v.id);
    const me = { id: "__new", name: v.name, genericName: v.genericName || null };
    const res = checkInteractions([me, ...others]);
    return {
      interactions: res.interactions.filter((i) => i.first.id === "__new" || i.second.id === "__new"),
      duplicates: res.duplicates.filter((d) => d.medicines.some((m) => m.id === "__new")),
    };
  }, [v.name, v.genericName, v.memberId, v.id, existing]);
  const alt = genericAlternative(v.name, v.times.length);

  const submit = () =>
    start(async () => {
      const res = await saveMedication({
        ...v,
        endDate: ongoing ? "" : v.endDate,
        pillsLeft: v.pillsLeft,
        refillAt: v.refillAt || 7,
        genericName: v.genericName || undefined,
        instructions: v.instructions || undefined,
        prescribedBy: v.prescribedBy || undefined,
      });
      if (res.ok) {
        toast.success(res.message, res.data?.warnings.length ? { description: `Heads up: ${res.data.warnings[0]}` } : undefined);
        router.push(`/medications?member=${v.memberId}`);
      } else {
        setErrors(res.fieldErrors ?? {});
        toast.error(res.error);
      }
    });

  return (
    <form
      action={submit}
      className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]"
      noValidate
    >
      <div className="flex flex-col gap-6">
        <section className="flex flex-col gap-5 rounded-xl border border-border bg-card p-5 sm:p-6">
          <h2 className="text-lg font-semibold">Medicine</h2>
          <Field label="Who is it for?" htmlFor="memberId" error={errors.memberId}>
            <NativeSelect id="memberId" value={v.memberId} onChange={(e) => set("memberId", e.target.value)} disabled={Boolean(v.id)}>
              {allowed.map((m) => (
                <NativeSelectOption key={m.id} value={m.id}>{m.name}</NativeSelectOption>
              ))}
            </NativeSelect>
          </Field>
          <Field label="Name on the strip" htmlFor="name" error={errors.name} hint="Brand or generic name, e.g. Glycomet or Metformin">
            <div className="relative">
              <Input
                id="name"
                value={v.name}
                autoComplete="off"
                role="combobox"
                aria-expanded={suggestions.length > 0}
                aria-controls="drug-suggestions"
                aria-autocomplete="list"
                onChange={(e) => { set("name", e.target.value); setShowSuggest(true); }}
                onBlur={() => setTimeout(() => setShowSuggest(false), 150)}
                {...describedBy("name", errors.name, true)}
              />
              {suggestions.length > 0 && (
                <ul id="drug-suggestions" role="listbox" className="absolute inset-x-0 top-full z-20 mt-1 overflow-hidden rounded-xl border border-border bg-popover p-1 shadow-pop">
                  {suggestions.map((d) => (
                    <li key={d.brand} role="option" aria-selected={false}>
                      <button
                        type="button"
                        className="flex min-h-12 w-full cursor-pointer items-center justify-between gap-3 rounded-md px-3 text-left hover:bg-muted"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => {
                          setV((s) => ({ ...s, name: d.brand, genericName: d.generics.map((g) => GENERIC_LABEL[g]).join(" + "), strength: d.strength }));
                          setShowSuggest(false);
                        }}
                      >
                        <span>
                          <span className="block text-base font-medium">{d.brand} <span className="font-normal text-muted-foreground">{d.strength}</span></span>
                          <span className="block text-sm text-muted-foreground">{d.generics.map((g) => GENERIC_LABEL[g]).join(" + ")}</span>
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </Field>
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Generic name" htmlFor="genericName" optional className="sm:col-span-1">
              <Input id="genericName" value={v.genericName} onChange={(e) => set("genericName", e.target.value)} />
            </Field>
            <Field label="Strength" htmlFor="strength" hint="e.g. 500 mg">
              <Input id="strength" value={v.strength} onChange={(e) => set("strength", e.target.value)} />
            </Field>
            <Field label="Form" htmlFor="form">
              <NativeSelect id="form" value={v.form} onChange={(e) => set("form", e.target.value)}>
                {FORMS.map((f) => <NativeSelectOption key={f} value={f}>{f[0].toUpperCase() + f.slice(1)}</NativeSelectOption>)}
              </NativeSelect>
            </Field>
          </div>
        </section>

        <section className="flex flex-col gap-5 rounded-xl border border-border bg-card p-5 sm:p-6">
          <h2 className="text-lg font-semibold">When to take it</h2>
          <fieldset>
            <legend className="mb-2 text-[0.9375rem] font-medium">How often</legend>
            <Segmented
              name="preset"
              label="How often"
              value={preset}
              onChange={(k) => { const p = SCHEDULE_PRESETS.find((x) => x.key === k); if (p) set("times", p.times); }}
              options={[...SCHEDULE_PRESETS.map((p) => ({ value: p.key, label: p.label })), { value: "custom", label: "Custom" }]}
            />
          </fieldset>
          <fieldset className="flex flex-col gap-2">
            <legend className="mb-2 text-[0.9375rem] font-medium">Dose times</legend>
            {v.times.map((t, i) => (
              <div key={i} className="flex items-center gap-2">
                <Clock className="size-5 text-muted-foreground" aria-hidden="true" />
                <Input
                  type="time"
                  aria-label={`Dose time ${i + 1}`}
                  value={t}
                  onChange={(e) => set("times", v.times.map((x, j) => (j === i ? e.target.value : x)))}
                  className="w-40"
                  required
                />
                <span className="text-sm text-muted-foreground">{t ? `${SLOT_LABEL[slotOf(t)]} · ${formatTime(t)}` : ""}</span>
                {v.times.length > 1 && (
                  <Button type="button" variant="ghost" size="icon" aria-label={`Remove time ${t}`} onClick={() => set("times", v.times.filter((_, j) => j !== i))} className="ml-auto">
                    <Trash2 aria-hidden="true" />
                  </Button>
                )}
              </div>
            ))}
            {errors.times && <p role="alert" className="text-sm font-medium text-danger">{errors.times}</p>}
            {v.times.length < 6 && (
              <Button type="button" variant="outline" size="sm" className="w-fit" onClick={() => set("times", [...v.times, "12:00"])}>
                <Plus aria-hidden="true" /> Add a time
              </Button>
            )}
          </fieldset>
          <fieldset>
            <legend className="mb-2 text-[0.9375rem] font-medium">Instructions</legend>
            <div className="mb-2 flex flex-wrap gap-2">
              {INSTRUCTIONS.map((ins) => (
                <button
                  key={ins}
                  type="button"
                  aria-pressed={v.instructions === ins}
                  onClick={() => set("instructions", v.instructions === ins ? "" : ins)}
                  className={cn(
                    "min-h-10 cursor-pointer rounded-full border px-3.5 text-[0.9375rem] transition-colors",
                    v.instructions === ins ? "border-primary bg-accent text-accent-foreground" : "border-border-strong hover:bg-muted"
                  )}
                >
                  {ins}
                </button>
              ))}
            </div>
            <label htmlFor="instructions" className="sr-only">Other instructions</label>
            <Input id="instructions" placeholder="Or write your own, e.g. 30 min before tea" value={v.instructions} onChange={(e) => set("instructions", e.target.value)} />
          </fieldset>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Start date" htmlFor="startDate" error={errors.startDate}>
              <Input id="startDate" type="date" value={v.startDate} onChange={(e) => set("startDate", e.target.value)} />
            </Field>
            <div className="flex flex-col gap-2">
              <div className="flex min-h-6 items-center justify-between gap-2">
                <label htmlFor="endDate" className="text-[0.9375rem] font-medium">End date</label>
                <label className="flex items-center gap-2 text-sm">
                  <Switch checked={ongoing} onCheckedChange={setOngoing} aria-label="No end date (ongoing)" /> Ongoing
                </label>
              </div>
              <Input id="endDate" type="date" value={ongoing ? "" : v.endDate} disabled={ongoing} onChange={(e) => set("endDate", e.target.value)} {...describedBy("endDate", errors.endDate)} />
              {errors.endDate && <p id="endDate-error" role="alert" className="text-sm font-medium text-danger">{errors.endDate}</p>}
            </div>
          </div>
        </section>

        <section className="flex flex-col gap-5 rounded-xl border border-border bg-card p-5 sm:p-6">
          <h2 className="text-lg font-semibold">Stock and doctor</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Tablets left" htmlFor="pillsLeft" optional hint="We count down as doses are ticked" error={errors.pillsLeft}>
              <Input id="pillsLeft" inputMode="numeric" value={v.pillsLeft} onChange={(e) => set("pillsLeft", e.target.value)} {...describedBy("pillsLeft", errors.pillsLeft, true)} />
            </Field>
            <Field label="Remind to refill at" htmlFor="refillAt" hint="Number of tablets">
              <Input id="refillAt" inputMode="numeric" value={v.refillAt} onChange={(e) => set("refillAt", e.target.value)} />
            </Field>
          </div>
          <Field label="Prescribed by" htmlFor="prescribedBy" optional>
            <Input id="prescribedBy" value={v.prescribedBy} onChange={(e) => set("prescribedBy", e.target.value)} placeholder="e.g. Dr. Farah Khan" />
          </Field>
        </section>
      </div>

      <aside className="flex flex-col gap-4 lg:sticky lg:top-24 lg:self-start">
        <section aria-live="polite" className="flex flex-col gap-3 rounded-xl border border-border bg-card p-5">
          <h2 className="flex items-center gap-2 text-base font-semibold">
            <ShieldAlert className="size-5 text-muted-foreground" aria-hidden="true" /> Clash check
          </h2>
          {v.name.trim().length < 3 ? (
            <p className="text-[0.9375rem] text-muted-foreground">Type the medicine name and we&apos;ll check it against this person&apos;s other medicines.</p>
          ) : clashes.interactions.length === 0 && clashes.duplicates.length === 0 ? (
            <StatusBadge tone="success" label="No known clashes" />
          ) : (
            <ul className="flex flex-col gap-3">
              {clashes.interactions.map((i) => (
                <li key={`${i.a}-${i.b}`} className="space-y-1.5">
                  <StatusBadge tone={i.severity === "major" ? "danger" : "warning"} label={i.severity === "major" ? `Serious with ${i.second.id === "__new" ? i.first.name : i.second.name}` : `Check timing with ${i.second.id === "__new" ? i.first.name : i.second.name}`} />
                  <p className="text-[0.9375rem]">{i.effect}</p>
                  <p className="text-sm text-muted-foreground">{i.advice}</p>
                </li>
              ))}
              {clashes.duplicates.map((d) => (
                <li key={d.generic} className="space-y-1.5">
                  <StatusBadge tone="warning" label="Same ingredient twice" />
                  <p className="text-[0.9375rem]">Already taking {d.medicines.filter((m) => m.id !== "__new").map((m) => m.name).join(", ")}, which also contains {GENERIC_LABEL[d.generic].toLowerCase()}.</p>
                </li>
              ))}
            </ul>
          )}
          <p className="text-sm text-muted-foreground">Not a diagnosis. Consult a doctor or pharmacist.</p>
        </section>
        {alt && alt.savingPercent > 20 && (
          <section className="flex gap-3 rounded-xl border border-success-border bg-success-soft/60 p-5">
            <BadgeIndianRupee className="size-5 shrink-0 text-success" aria-hidden="true" />
            <p className="text-[0.9375rem]">
              <span className="font-semibold">Generic option:</span> {alt.genericName} costs about ₹{alt.genericPrice} for 10 instead of ₹{alt.brand.brandPrice} ({alt.savingPercent}% less, ~₹{alt.monthlySaving}/month). Ask your doctor or pharmacist whether it suits you.
            </p>
          </section>
        )}
        <div className="flex flex-col gap-2 rounded-xl border border-border bg-card p-5">
          <Button type="submit" size="lg" disabled={pending || !v.memberId}>
            {pending ? "Saving…" : v.id ? "Save changes" : "Add medicine"}
          </Button>
          <Button type="button" variant="ghost" onClick={() => router.back()}>Cancel</Button>
        </div>
      </aside>
    </form>
  );
}
