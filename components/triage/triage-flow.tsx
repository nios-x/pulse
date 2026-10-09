"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { ArrowLeft, CalendarPlus, CircleCheck, Cpu, Phone, ShieldCheck, Siren, Stethoscope, TriangleAlert } from "lucide-react";
import { toast } from "sonner";
import { triageAction } from "@/app/actions/triage";
import { Field } from "@/components/form/field";
import { Segmented } from "@/components/form/segmented";
import { SafetyNote } from "@/components/health/safety-note";
import { useAccess } from "@/components/providers/access-provider";
import { SpeakButton } from "@/components/voice/speak-button";
import { VoiceInput } from "@/components/voice/voice-input";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import type { TriageLevel } from "@/db/schema";
import { LANGUAGES } from "@/lib/languages";
import type { TriageResult } from "@/lib/triage/engine";
import { RED_FLAG_QUESTIONS, type RedFlagKey } from "@/lib/triage/rules";
import { cn } from "@/lib/utils";

const LEVEL_STYLE: Record<TriageLevel, { wrap: string; icon: typeof Siren; word: string }> = {
  emergency: { wrap: "border-emergency bg-emergency text-emergency-foreground", icon: Siren, word: "Emergency" },
  urgent: { wrap: "border-danger-border bg-danger-soft text-danger", icon: TriangleAlert, word: "Urgent: today" },
  doctor: { wrap: "border-warning-border bg-warning-soft text-warning", icon: Stethoscope, word: "See a doctor soon" },
  self_care: { wrap: "border-success-border bg-success-soft text-success", icon: CircleCheck, word: "Home care" },
};

const DURATIONS = [
  { value: "0", label: "Today" },
  { value: "2", label: "1–3 days" },
  { value: "5", label: "4–7 days" },
  { value: "10", label: "Over a week" },
];

export function TriageFlow({ members, defaultMemberId }: { members: { id: string; name: string; sex: string | null; age: number | null }[]; defaultMemberId?: string }) {
  const { can } = useAccess();
  const allowed = members.filter((m) => can("triage.use", m.id));
  const [memberId, setMemberId] = useState(allowed.find((m) => m.id === defaultMemberId)?.id ?? allowed[0]?.id ?? "");
  const [lang, setLang] = useState("en-IN");
  const [symptoms, setSymptoms] = useState("");
  const [flags, setFlags] = useState<Partial<Record<RedFlagKey, boolean>>>({});
  const [duration, setDuration] = useState("0");
  const [severity, setSeverity] = useState(4);
  const [temp, setTemp] = useState("");
  const [pregnant, setPregnant] = useState(false);
  const [result, setResult] = useState<TriageResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const member = allowed.find((m) => m.id === memberId);
  const canBePregnant = member?.sex === "female" && member.age != null && member.age >= 12 && member.age <= 55;
  const hindi = lang.startsWith("hi");

  const submit = () =>
    start(async () => {
      setError(null);
      const res = await triageAction({
        memberId,
        symptoms,
        language: lang,
        flags,
        durationDays: Number(duration),
        severity,
        temperatureF: temp || undefined,
        pregnant: canBePregnant ? pregnant : undefined,
      });
      if (res.ok && res.data) {
        setResult(res.data);
        window.scrollTo({ top: 0, behavior: "smooth" });
      } else if (!res.ok) {
        setError(res.fieldErrors?.symptoms ?? res.error);
        toast.error(res.error);
      }
    });

  if (result) {
    const s = LEVEL_STYLE[result.level];
    const Icon = s.icon;
    const speech = [result.title, result.action, result.summary, ...result.whatToDo].join(". ");
    return (
      <div className="flex flex-col gap-6" aria-live="polite">
        <section className={cn("flex flex-col gap-4 rounded-2xl border-2 p-6 sm:p-8", s.wrap)}>
          <div className="flex items-center gap-3">
            <span className={cn("flex size-12 items-center justify-center rounded-full", result.level === "emergency" ? "bg-emergency-foreground/15" : "bg-card")}>
              <Icon className="size-7" aria-hidden="true" />
            </span>
            <p className="text-sm font-bold tracking-wider uppercase">{s.word}</p>
          </div>
          <h2 className="text-[1.75rem] leading-tight font-bold text-inherit sm:text-[2.25rem]">{result.title}</h2>
          <p className={cn("text-lg font-medium", result.level === "emergency" ? "" : "text-foreground")}>{result.action}</p>
          {result.level === "emergency" && (
            <div className="flex flex-wrap gap-3">
              <a href="tel:112" className="inline-flex h-14 items-center gap-2 rounded-xl bg-emergency-foreground px-6 text-lg font-bold text-emergency"><Phone className="size-6" aria-hidden="true" /> Call 112</a>
              <a href="tel:108" className="inline-flex h-14 items-center gap-2 rounded-xl border-2 border-emergency-foreground px-6 text-lg font-bold"><Siren className="size-6" aria-hidden="true" /> Ambulance 108</a>
              {result.redFlags.some((f) => f.code === "self_harm") && (
                <a href="tel:14416" className="inline-flex h-14 items-center gap-2 rounded-xl border-2 border-emergency-foreground px-6 text-lg font-bold"><Phone className="size-6" aria-hidden="true" /> Tele-MANAS 14416</a>
              )}
            </div>
          )}
        </section>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
          <div className="flex flex-col gap-6">
            {result.redFlags.length > 0 && (
              <section className="rounded-xl border border-border bg-card p-5">
                <h3 className="flex items-center gap-2 text-lg font-semibold"><ShieldCheck className="size-5 text-primary" aria-hidden="true" /> Warning signs found</h3>
                <ul className="mt-3 flex flex-col gap-2">
                  {result.redFlags.map((f) => (
                    <li key={f.code} className="flex gap-2.5 text-base"><TriangleAlert className="mt-1 size-4 shrink-0 text-danger" aria-hidden="true" /> {f.reason}</li>
                  ))}
                </ul>
              </section>
            )}
            <section className="rounded-xl border border-border bg-card p-5">
              <h3 className="text-lg font-semibold">{hindi ? "क्या करें" : "What to do now"}</h3>
              <p className="mt-2 text-base text-muted-foreground">{result.summary}</p>
              <ol className="mt-3 flex list-decimal flex-col gap-2 pl-6 text-base marker:font-semibold">
                {result.whatToDo.map((w) => <li key={w}>{w}</li>)}
              </ol>
            </section>
            {result.watchFor.length > 0 && (
              <section className="rounded-xl border border-border bg-card p-5">
                <h3 className="text-lg font-semibold">Get help sooner if you notice</h3>
                <ul className="mt-3 flex flex-col gap-2 text-base">{result.watchFor.map((w) => <li key={w} className="flex gap-2.5"><TriangleAlert className="mt-1 size-4 shrink-0 text-warning" aria-hidden="true" /> {w}</li>)}</ul>
              </section>
            )}
            {result.questionsForDoctor.length > 0 && (
              <section className="rounded-xl border border-border bg-card p-5">
                <h3 className="text-lg font-semibold">Questions to ask the doctor</h3>
                <ul className="mt-3 list-disc space-y-1.5 pl-6 text-base">{result.questionsForDoctor.map((q) => <li key={q}>{q}</li>)}</ul>
              </section>
            )}
          </div>
          <aside className="flex flex-col gap-4">
            <section className="rounded-xl border border-border bg-card p-5">
              <h3 className="text-base font-semibold">How this was decided</h3>
              <ol className="mt-3 flex flex-col gap-3 text-[0.9375rem]">
                <li className="flex gap-3"><ShieldCheck className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden="true" /> <span><span className="font-medium">Safety rules ran first</span> and checked for emergency signs like chest pain with sweating.</span></li>
                <li className="flex gap-3"><Cpu className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden="true" /> <span>{result.source === "rules+ai" ? <><span className="font-medium">AI then suggested a level</span> and plain advice. It can raise the level but never lower it.</> : <><span className="font-medium">AI was not used</span>{result.level === "emergency" ? " because the rules found an emergency." : "."}</>}</span></li>
              </ol>
              {result.aiNote && <p className="mt-3 rounded-lg bg-surface px-3 py-2 text-sm">{result.aiNote}</p>}
            </section>
            <div className="flex flex-col gap-2">
              {result.level !== "emergency" && (
                <Link href={`/appointments/book?member=${memberId}${result.specialty ? `&specialty=${encodeURIComponent(result.specialty.split(" ")[0])}` : ""}`} className={buttonVariants({ size: "lg" })}>
                  <CalendarPlus aria-hidden="true" /> Book {result.level === "urgent" ? "a video consult today" : "a doctor"}
                </Link>
              )}
              <SpeakButton text={speech} lang={lang} label="Read the advice aloud" size="default" />
              <Button variant="ghost" onClick={() => { setResult(null); setSymptoms(""); setFlags({}); }}><ArrowLeft aria-hidden="true" /> Start a new check</Button>
            </div>
            <SafetyNote>This is a triage level, not a diagnosis. It cannot examine you. Consult a doctor. In an emergency, call 112.</SafetyNote>
          </aside>
        </div>
      </div>
    );
  }

  return (
    <form action={submit} className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]" noValidate>
      <div className="flex flex-col gap-6">
        <section className="flex flex-col gap-5 rounded-xl border border-border bg-card p-5 sm:p-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Who is unwell?" htmlFor="t-member">
              <NativeSelect id="t-member" value={memberId} onChange={(e) => setMemberId(e.target.value)}>
                {allowed.map((m) => <NativeSelectOption key={m.id} value={m.id}>{m.name}{m.age != null ? ` (${m.age})` : ""}</NativeSelectOption>)}
              </NativeSelect>
            </Field>
            <Field label="Language" htmlFor="t-lang" hint="For speaking and for the answer">
              <NativeSelect id="t-lang" value={lang} onChange={(e) => setLang(e.target.value)}>
                {LANGUAGES.map((l) => <NativeSelectOption key={l.code} value={l.code}>{l.native} · {l.label}</NativeSelectOption>)}
              </NativeSelect>
            </Field>
          </div>
          <Field label={hindi ? "क्या तकलीफ़ है? अपने शब्दों में बताएँ" : "What's happening? Describe it in your own words"} htmlFor="t-symptoms" error={error ?? undefined}>
            <Textarea
              id="t-symptoms"
              value={symptoms}
              onChange={(e) => setSymptoms(e.target.value)}
              rows={4}
              className="min-h-32 text-lg"
              placeholder={hindi ? "जैसे: कल रात से बुखार और खांसी" : "e.g. Fever since last night, cough, body ache"}
              aria-invalid={error ? true : undefined}
            />
          </Field>
          <VoiceInput lang={lang} onText={(text) => setSymptoms(text)} />
        </section>

        <section className="flex flex-col gap-4 rounded-xl border border-border bg-card p-5 sm:p-6">
          <div>
            <h2 className="text-lg font-semibold">Any of these right now?</h2>
            <p className="text-[0.9375rem] text-muted-foreground">Tap all that apply. These are checked first, before any AI.</p>
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            {RED_FLAG_QUESTIONS.map((q) => {
              const on = Boolean(flags[q.key]);
              return (
                <button
                  key={q.key}
                  type="button"
                  aria-pressed={on}
                  onClick={() => setFlags((f) => ({ ...f, [q.key]: !on }))}
                  className={cn("flex min-h-14 cursor-pointer items-center gap-3 rounded-lg border px-3.5 py-2 text-left text-base transition-colors duration-150", on ? "border-danger-border bg-danger-soft font-medium text-danger" : "border-border hover:bg-muted")}
                >
                  <span className={cn("flex size-6 shrink-0 items-center justify-center rounded-md border-2", on ? "border-danger bg-danger text-card" : "border-border-strong")}>{on && <TriangleAlert className="size-3.5" aria-hidden="true" />}</span>
                  <span>{hindi ? q.hi : q.label}</span>
                </button>
              );
            })}
          </div>
          {canBePregnant && (
            <label className="flex min-h-12 cursor-pointer items-center gap-3 text-base">
              <input type="checkbox" checked={pregnant} onChange={(e) => setPregnant(e.target.checked)} className="size-5 accent-[var(--primary)]" /> Pregnant or might be pregnant
            </label>
          )}
        </section>
      </div>

      <aside className="flex flex-col gap-4 lg:sticky lg:top-24 lg:self-start">
        <section className="flex flex-col gap-5 rounded-xl border border-border bg-card p-5 sm:p-6">
          <fieldset>
            <legend className="mb-2 text-[0.9375rem] font-medium">Since when?</legend>
            <Segmented name="duration" label="Since when" value={duration} onChange={setDuration} options={DURATIONS} />
          </fieldset>
          <div className="flex flex-col gap-2">
            <label htmlFor="t-sev" className="flex items-center justify-between text-[0.9375rem] font-medium">How bad is it? <span className="text-lg font-semibold tabular">{severity}/10</span></label>
            <input id="t-sev" type="range" min={1} max={10} value={severity} onChange={(e) => setSeverity(Number(e.target.value))} className="h-11 w-full cursor-pointer accent-[var(--primary)]" aria-valuetext={`${severity} out of 10`} />
            <div className="flex justify-between text-sm text-muted-foreground"><span>Mild</span><span>Very bad</span></div>
          </div>
          <Field label="Temperature (°F)" htmlFor="t-temp" optional>
            <Input id="t-temp" inputMode="decimal" value={temp} onChange={(e) => setTemp(e.target.value)} placeholder="e.g. 100.4" />
          </Field>
          <Button type="submit" size="lg" disabled={pending || !memberId || symptoms.trim().length < 3}>
            <Stethoscope aria-hidden="true" /> {pending ? "Checking…" : "Check how urgent this is"}
          </Button>
          <p className="text-sm text-muted-foreground">If someone has collapsed, can&apos;t breathe or has chest pain, don&apos;t wait: call 112.</p>
        </section>
        <SafetyNote>Gives a triage level (how soon to get care), never a diagnosis. Not a diagnosis. Consult a doctor.</SafetyNote>
      </aside>
    </form>
  );
}
