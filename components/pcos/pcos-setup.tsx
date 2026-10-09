"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, Check, FileText, HeartHandshake, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { savePcosSetup } from "@/app/actions/pcos";
import { burst, celebrate, pop } from "@/components/game/rewards";
import { Field } from "@/components/form/field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { PcosPrescribed } from "@/db/schema";
import type { OnboardingAnswers } from "@/lib/pcos";
import { cn } from "@/lib/utils";

type Q = { key: keyof OnboardingAnswers; title: string; multi?: boolean; options: { value: string | boolean; label: string }[] };

const QUESTIONS: Q[] = [
  { key: "diagnosedWhen", title: "When were you diagnosed?", options: [{ value: "recent", label: "In the last year" }, { value: "1_3_years", label: "1–3 years ago" }, { value: "3_plus_years", label: "More than 3 years ago" }, { value: "suspected", label: "Not yet confirmed" }] },
  { key: "wasBirthControl", title: "Did symptoms start after stopping birth-control pills?", options: [{ value: true, label: "Yes" }, { value: false, label: "No / not sure" }] },
  { key: "weightDistribution", title: "Where does your body tend to gain weight?", options: [{ value: "midsection", label: "Around the tummy" }, { value: "even", label: "Evenly" }, { value: "lean", label: "I'm on the lean side" }, { value: "prefer_not", label: "Prefer not to say" }] },
  { key: "concerns", title: "What bothers you most? Pick any", multi: true, options: [{ value: "acne", label: "Acne" }, { value: "hair_growth", label: "Extra hair" }, { value: "hair_thinning", label: "Hair thinning" }, { value: "bloating", label: "Bloating" }, { value: "fatigue", label: "Tiredness" }, { value: "mood", label: "Mood swings" }] },
  { key: "stressLevel", title: "How is your stress lately?", options: [{ value: "managing", label: "Managing okay" }, { value: "constant", label: "Constantly stressed" }, { value: "panic_anxiety", label: "Anxious or panicky" }] },
  { key: "sleepPattern", title: "When do you usually fall asleep?", options: [{ value: "before_midnight", label: "Before midnight" }, { value: "midnight_2am", label: "Midnight to 2 am" }, { value: "after_2am", label: "After 2 am" }, { value: "chaotic", label: "It changes a lot" }] },
  { key: "eatingPattern", title: "Which sounds most like your eating?", options: [{ value: "regular_3meals", label: "Three regular meals" }, { value: "skip_breakfast", label: "I often skip breakfast" }, { value: "eat_when_remember", label: "I eat when I remember" }, { value: "restrict_binge", label: "I restrict, then overeat" }] },
  { key: "topPriority", title: "What matters most right now?", options: [{ value: "periods", label: "Regular periods" }, { value: "skin", label: "Clearer skin" }, { value: "energy", label: "More energy" }, { value: "weight", label: "Weight" }, { value: "fertility", label: "Fertility" }, { value: "all", label: "All of it" }] },
];

const EMPTY: PcosPrescribed = { name: "", dose: "", frequency: "" };

export function PcosSetup({ memberId, initial }: { memberId: string; initial?: { doctorName: string | null; diagnosedOn: string | null; prescribed: PcosPrescribed[]; supplements: PcosPrescribed[]; answers: Partial<OnboardingAnswers> } }) {
  const router = useRouter();
  const [step, setStep] = useState(0); // 0 prescription, 1..n questions
  const [doctorName, setDoctor] = useState(initial?.doctorName ?? "");
  const [diagnosedOn, setDiagnosed] = useState(initial?.diagnosedOn ?? "");
  const [meds, setMeds] = useState<PcosPrescribed[]>(initial?.prescribed.length ? initial.prescribed : [{ ...EMPTY }]);
  const [supps, setSupps] = useState<PcosPrescribed[]>(initial?.supplements ?? []);
  const [answers, setAnswers] = useState<Partial<OnboardingAnswers>>({ concerns: [], ...initial?.answers });
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const total = QUESTIONS.length + 1;
  const q = step > 0 ? QUESTIONS[step - 1] : null;

  const next = (button?: HTMLElement) => {
    setError(null);
    if (step === 0) {
      if (doctorName.trim().length < 2) return setError("Please add your doctor's name. Pulse works with your doctor's guidance, not instead of it.");
      if (!meds.some((m) => m.name.trim())) return setError("Please add at least one item from your doctor's prescription.");
    } else if (q && !q.multi && answers[q.key] === undefined) return setError("Pick one option to continue.");
    if (step < total - 1) {
      burst(button, { kind: "sparkle", count: 8, spread: 50 });
      pop(document.querySelector("[data-setup-count]"), 0.8);
      setStep(step + 1);
    }
    else
      start(async () => {
        const res = await savePcosSetup({ memberId, doctorName, diagnosedOn, prescribed: meds.filter((m) => m.name.trim()), supplements: supps.filter((m) => m.name.trim()), answers });
        if (res.ok) {
          celebrate({ title: "Your plan is ready", message: res.message });
          if (res.data?.eatingConcern) toast.info("If food feels stressful, talking helps. iCall: 9152987821 (free, confidential).", { duration: 10000 });
          router.push(`/pcos?member=${memberId}`);
        } else setError(res.error);
      });
  };

  const list = (items: PcosPrescribed[], set: (v: PcosPrescribed[]) => void, label: string) => (
    <div className="flex flex-col gap-2">
      {items.map((m, i) => (
        <div key={i} className="grid gap-2 sm:grid-cols-[1.4fr_1fr_1fr_auto]">
          <Input aria-label={`${label} name`} placeholder="Name, e.g. Metformin" value={m.name} onChange={(e) => set(items.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)))} />
          <Input aria-label={`${label} dose`} placeholder="Dose, e.g. 500 mg" value={m.dose} onChange={(e) => set(items.map((x, j) => (j === i ? { ...x, dose: e.target.value } : x)))} />
          <Input aria-label={`${label} when`} placeholder="When, e.g. with dinner" value={m.frequency} onChange={(e) => set(items.map((x, j) => (j === i ? { ...x, frequency: e.target.value } : x)))} />
          <Button type="button" variant="ghost" size="icon" aria-label={`Remove ${m.name || label}`} onClick={() => set(items.filter((_, j) => j !== i))}><Trash2 aria-hidden="true" /></Button>
        </div>
      ))}
      <Button type="button" variant="outline" size="sm" className="w-fit" onClick={() => set([...items, { ...EMPTY }])}><Plus aria-hidden="true" /> Add {label.toLowerCase()}</Button>
    </div>
  );

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
      <div className="flex items-center gap-3">
        <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted" role="progressbar" aria-label="Setup progress" aria-valuemin={0} aria-valuemax={total} aria-valuenow={step + 1}>
          <div className="h-full rounded-full bg-brand transition-[width] duration-300" style={{ width: `${((step + 1) / total) * 100}%` }} />
        </div>
        <span data-setup-count className="text-sm font-medium text-muted-foreground tabular">{step + 1} / {total}</span>
      </div>

      {step === 0 ? (
        <section className="flex flex-col gap-5 rounded-2xl border border-border bg-card p-5 sm:p-6">
          <div className="flex items-start gap-3">
            <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-accent-foreground"><FileText className="size-5" aria-hidden="true" /></span>
            <div>
              <h2 className="font-heading text-xl font-bold">Start with your doctor&apos;s prescription</h2>
              <p className="text-[0.9375rem] text-muted-foreground">Pulse works with your doctor&apos;s plan, never instead of it. We only suggest everyday habits around it.</p>
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Doctor's name" htmlFor="p-doc"><Input id="p-doc" value={doctorName} onChange={(e) => setDoctor(e.target.value)} placeholder="e.g. Dr. Sneha Banerjee" /></Field>
            <Field label="Diagnosed on" htmlFor="p-diag" optional><Input id="p-diag" type="date" value={diagnosedOn} onChange={(e) => setDiagnosed(e.target.value)} /></Field>
          </div>
          <fieldset><legend className="mb-2 text-[0.9375rem] font-semibold">Medicines prescribed</legend>{list(meds, setMeds, "Medicine")}</fieldset>
          <fieldset><legend className="mb-2 text-[0.9375rem] font-semibold">Supplements your doctor recommended <span className="font-normal text-muted-foreground">(optional)</span></legend>{list(supps, setSupps, "Supplement")}</fieldset>
          <p className="text-sm text-muted-foreground">Only take supplements your doctor has recommended. What works for others may not work for you.</p>
        </section>
      ) : (
        q && (
          <section className="flex flex-col gap-5 rounded-2xl border border-border bg-card p-5 sm:p-6">
            <h2 className="font-heading text-xl font-bold">{q.title}</h2>
            <div role={q.multi ? "group" : "radiogroup"} aria-label={q.title} className="grid gap-2 sm:grid-cols-2">
              {q.options.map((o) => {
                const val = answers[q.key];
                const on = q.multi ? (val as string[] | undefined)?.includes(o.value as string) : val === o.value;
                return (
                  <button
                    key={String(o.value)}
                    type="button"
                    role={q.multi ? "checkbox" : "radio"}
                    aria-checked={Boolean(on)}
                    onClick={(e) => {
                      if (!on) pop(e.currentTarget.firstElementChild, 1.2);
                      setAnswers((a) => {
                        if (!q.multi) return { ...a, [q.key]: o.value };
                        const cur = (a[q.key] as string[]) ?? [];
                        return { ...a, [q.key]: on ? cur.filter((x) => x !== o.value) : [...cur, o.value as string] };
                      });
                    }}
                    className={cn("flex min-h-14 cursor-pointer items-center gap-3 rounded-2xl border px-4 text-left text-base transition-colors", on ? "border-brand bg-brand-soft font-semibold text-accent-foreground" : "border-border hover:bg-muted/60")}
                  >
                    <span className={cn("flex size-6 shrink-0 items-center justify-center border-2", q.multi ? "rounded-md" : "rounded-full", on ? "border-brand bg-brand text-brand-foreground" : "border-border-strong")}>{on && <Check className="size-3.5" strokeWidth={3} aria-hidden="true" />}</span>
                    {o.label}
                  </button>
                );
              })}
            </div>
            {q.key === "eatingPattern" && (
              <p className="flex gap-2 rounded-xl bg-surface px-3.5 py-3 text-sm text-muted-foreground"><HeartHandshake className="mt-0.5 size-4 shrink-0" aria-hidden="true" /> There are no wrong answers. If food ever feels stressful, iCall (9152987821) is free and confidential.</p>
            )}
          </section>
        )
      )}

      {error && <p role="alert" className="text-sm font-medium text-danger">{error}</p>}
      <div className="flex items-center justify-between">
        <Button variant="ghost" disabled={step === 0} onClick={() => { setError(null); setStep(step - 1); }}><ArrowLeft aria-hidden="true" /> Back</Button>
        <Button variant={step === total - 1 ? "default" : "brand"} size="lg" onClick={(e) => next(e.currentTarget)} disabled={pending}>
          {step === total - 1 ? (pending ? "Saving…" : "See my plan") : "Continue"} <ArrowRight aria-hidden="true" />
        </Button>
      </div>
    </div>
  );
}
