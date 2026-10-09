"use client";

import { useState, useTransition } from "react";
import { ArrowLeft, ArrowRight, Check, Home, KeyRound, Plus, Trash2, Users } from "lucide-react";
import { createFamilyAction, joinFamilyAction } from "@/app/actions/onboarding";
import { Field } from "@/components/form/field";
import { MemberAvatar } from "@/components/health/member-avatar";
import { RoleBadge } from "@/components/health/role-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import type { Relation, Role } from "@/db/schema";
import { BLOOD_GROUPS, RELATION_LABEL } from "@/lib/labels";
import { ROLE_LABEL, ROLE_SUMMARY, ROLES } from "@/lib/permissions";
import { cn } from "@/lib/utils";

type Person = { name: string; relation: Relation; role: Role; dateOfBirth: string; sex: "" | "female" | "male" | "other"; bloodGroup: string };

const STEPS = ["Your family", "About you", "Family members", "Roles"] as const;

const SUGGESTED_ROLE: Record<Relation, Role> = { self: "admin", spouse: "caregiver", parent: "member", child: "member", grandparent: "viewer", sibling: "viewer", other: "viewer" };

export function OnboardingWizard({ userName }: { userName: string }) {
  const [mode, setMode] = useState<"choose" | "create" | "join">("choose");
  const [step, setStep] = useState(0);
  const [familyName, setFamilyName] = useState(`${userName.trim().split(/\s+/).at(-1)} family`);
  const [city, setCity] = useState("");
  const [me, setMe] = useState({ dateOfBirth: "", sex: "" as Person["sex"], bloodGroup: "" });
  const [others, setOthers] = useState<Person[]>([]);
  const [draft, setDraft] = useState<Person>({ name: "", relation: "parent", role: "member", dateOfBirth: "", sex: "", bloodGroup: "" });
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const addDraft = () => {
    if (draft.name.trim().length < 2) { setError("Enter the person's name."); return; }
    setOthers((o) => [...o, { ...draft, name: draft.name.trim() }]);
    setDraft({ name: "", relation: "parent", role: "member", dateOfBirth: "", sex: "", bloodGroup: "" });
    setError(null);
  };

  const finish = () =>
    start(async () => {
      setError(null);
      const res = await createFamilyAction({ familyName, city, me, others });
      if (res && !res.ok) setError(res.error);
    });

  const join = () =>
    start(async () => {
      setError(null);
      const res = await joinFamilyAction(code);
      if (res && !res.ok) setError(res.error);
    });

  if (mode === "choose") {
    return (
      <div className="flex flex-col gap-6">
        <div className="space-y-2">
          <h1 className="text-[2rem] leading-tight font-semibold">Welcome, {userName.split(" ")[0]}</h1>
          <p className="text-lg text-muted-foreground">Start a family space, or join one someone already set up.</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <button type="button" onClick={() => setMode("create")} className="group flex cursor-pointer flex-col gap-3 rounded-xl border border-border bg-card p-6 text-left transition-[border-color,box-shadow] hover:border-primary hover:shadow-pop">
            <span className="flex size-12 items-center justify-center rounded-xl bg-accent text-accent-foreground"><Home className="size-6" aria-hidden="true" /></span>
            <span className="text-lg font-semibold">Create a family</span>
            <span className="text-[0.9375rem] text-muted-foreground">You&apos;ll be the admin. Add parents, children and caregivers.</span>
            <span className="mt-auto inline-flex items-center gap-1 pt-2 text-[0.9375rem] font-medium text-primary">Start <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" aria-hidden="true" /></span>
          </button>
          <button type="button" onClick={() => setMode("join")} className="group flex cursor-pointer flex-col gap-3 rounded-xl border border-border bg-card p-6 text-left transition-[border-color,box-shadow] hover:border-primary hover:shadow-pop">
            <span className="flex size-12 items-center justify-center rounded-xl bg-accent text-accent-foreground"><KeyRound className="size-6" aria-hidden="true" /></span>
            <span className="text-lg font-semibold">I have an invite code</span>
            <span className="text-[0.9375rem] text-muted-foreground">Join your family with the 6-letter code they sent you.</span>
            <span className="mt-auto inline-flex items-center gap-1 pt-2 text-[0.9375rem] font-medium text-primary">Join <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" aria-hidden="true" /></span>
          </button>
        </div>
      </div>
    );
  }

  if (mode === "join") {
    return (
      <form action={join} className="flex flex-col gap-6">
        <button type="button" onClick={() => { setMode("choose"); setError(null); }} className="inline-flex w-fit cursor-pointer items-center gap-1.5 text-[0.9375rem] font-medium text-muted-foreground hover:text-foreground"><ArrowLeft className="size-4" aria-hidden="true" /> Back</button>
        <div className="space-y-2">
          <h1 className="text-[2rem] leading-tight font-semibold">Join your family</h1>
          <p className="text-lg text-muted-foreground">Enter the invite code from your family admin.</p>
        </div>
        <Field label="Invite code" htmlFor="join-code" error={error ?? undefined}>
          <Input id="join-code" value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} maxLength={8} autoComplete="off" className="h-16 text-center font-mono text-3xl tracking-[0.4em] uppercase" placeholder="ABC234" />
        </Field>
        <Button type="submit" size="lg" disabled={pending || code.trim().length < 6}>{pending ? "Joining…" : "Join family"}</Button>
      </form>
    );
  }

  return (
    <div className="flex flex-col gap-8">
      <nav aria-label="Setup progress">
        <ol className="flex items-center gap-2">
          {STEPS.map((s, i) => (
            <li key={s} className="flex flex-1 items-center gap-2">
              <span aria-current={i === step ? "step" : undefined} className={cn("flex size-9 shrink-0 items-center justify-center rounded-full border-2 text-sm font-semibold transition-colors", i < step ? "border-primary bg-primary text-primary-foreground" : i === step ? "border-primary text-primary" : "border-border-strong text-muted-foreground")}>
                {i < step ? <Check className="size-4" aria-hidden="true" /> : i + 1}
                <span className="sr-only">{s}{i < step ? " (done)" : i === step ? " (current)" : ""}</span>
              </span>
              <span className={cn("hidden text-sm font-medium sm:inline", i === step ? "text-foreground" : "text-muted-foreground")}>{s}</span>
              {i < STEPS.length - 1 && <span className={cn("h-0.5 flex-1 rounded-full", i < step ? "bg-primary" : "bg-border")} aria-hidden="true" />}
            </li>
          ))}
        </ol>
        <p className="mt-3 text-sm text-muted-foreground">Step {step + 1} of {STEPS.length}</p>
      </nav>

      {step === 0 && (
        <section className="flex flex-col gap-5">
          <div className="space-y-2">
            <h1 className="text-[1.75rem] leading-tight font-semibold">Name your family space</h1>
            <p className="text-base text-muted-foreground">This is what everyone sees when they join.</p>
          </div>
          <Field label="Family name" htmlFor="ob-family"><Input id="ob-family" value={familyName} onChange={(e) => setFamilyName(e.target.value)} /></Field>
          <Field label="City" htmlFor="ob-city" optional hint="Helps us suggest doctors nearby"><Input id="ob-city" value={city} onChange={(e) => setCity(e.target.value)} placeholder="e.g. Pune" /></Field>
        </section>
      )}

      {step === 1 && (
        <section className="flex flex-col gap-5">
          <div className="space-y-2">
            <h1 className="text-[1.75rem] leading-tight font-semibold">A little about you</h1>
            <p className="text-base text-muted-foreground">You&apos;re the first member and the family admin. You can fill in the rest later.</p>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Date of birth" htmlFor="ob-dob"><Input id="ob-dob" type="date" value={me.dateOfBirth} onChange={(e) => setMe({ ...me, dateOfBirth: e.target.value })} /></Field>
            <Field label="Sex" htmlFor="ob-sex">
              <NativeSelect id="ob-sex" value={me.sex} onChange={(e) => setMe({ ...me, sex: e.target.value as Person["sex"] })}>
                <NativeSelectOption value="">Prefer not to say</NativeSelectOption><NativeSelectOption value="female">Female</NativeSelectOption><NativeSelectOption value="male">Male</NativeSelectOption><NativeSelectOption value="other">Other</NativeSelectOption>
              </NativeSelect>
            </Field>
            <Field label="Blood group" htmlFor="ob-blood">
              <NativeSelect id="ob-blood" value={me.bloodGroup} onChange={(e) => setMe({ ...me, bloodGroup: e.target.value })}>
                <NativeSelectOption value="">Not known</NativeSelectOption>{BLOOD_GROUPS.map((b) => <NativeSelectOption key={b} value={b}>{b}</NativeSelectOption>)}
              </NativeSelect>
            </Field>
          </div>
        </section>
      )}

      {step === 2 && (
        <section className="flex flex-col gap-5">
          <div className="space-y-2">
            <h1 className="text-[1.75rem] leading-tight font-semibold">Who else is in the family?</h1>
            <p className="text-base text-muted-foreground">Add parents, a spouse, children. They don&apos;t need a login; you can invite them later.</p>
          </div>
          <div className="grid gap-3 rounded-xl border border-border bg-card p-4 sm:grid-cols-2">
            <Field label="Name" htmlFor="ob-o-name" className="sm:col-span-2"><Input id="ob-o-name" value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addDraft(); } }} placeholder="e.g. Suresh Mehta" /></Field>
            <Field label="Relation to you" htmlFor="ob-o-rel">
              <NativeSelect id="ob-o-rel" value={draft.relation} onChange={(e) => { const r = e.target.value as Relation; setDraft({ ...draft, relation: r, role: SUGGESTED_ROLE[r] }); }}>
                {(Object.keys(RELATION_LABEL) as Relation[]).filter((r) => r !== "self").map((r) => <NativeSelectOption key={r} value={r}>{RELATION_LABEL[r]}</NativeSelectOption>)}
              </NativeSelect>
            </Field>
            <Field label="Date of birth" htmlFor="ob-o-dob" optional><Input id="ob-o-dob" type="date" value={draft.dateOfBirth} onChange={(e) => setDraft({ ...draft, dateOfBirth: e.target.value })} /></Field>
            <Field label="Sex" htmlFor="ob-o-sex">
              <NativeSelect id="ob-o-sex" value={draft.sex} onChange={(e) => setDraft({ ...draft, sex: e.target.value as Person["sex"] })}>
                <NativeSelectOption value="">Prefer not to say</NativeSelectOption><NativeSelectOption value="female">Female</NativeSelectOption><NativeSelectOption value="male">Male</NativeSelectOption><NativeSelectOption value="other">Other</NativeSelectOption>
              </NativeSelect>
            </Field>
            <Field label="Blood group" htmlFor="ob-o-blood">
              <NativeSelect id="ob-o-blood" value={draft.bloodGroup} onChange={(e) => setDraft({ ...draft, bloodGroup: e.target.value })}>
                <NativeSelectOption value="">Not known</NativeSelectOption>{BLOOD_GROUPS.map((b) => <NativeSelectOption key={b} value={b}>{b}</NativeSelectOption>)}
              </NativeSelect>
            </Field>
            <div className="sm:col-span-2"><Button type="button" variant="outline" onClick={addDraft}><Plus aria-hidden="true" /> Add to family</Button></div>
          </div>
          {error && <p role="alert" className="text-sm font-medium text-danger">{error}</p>}
          {others.length === 0 ? (
            <p className="flex items-center gap-2 text-[0.9375rem] text-muted-foreground"><Users className="size-5" aria-hidden="true" /> No one added yet. You can skip this and add people later.</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {others.map((o, i) => (
                <li key={i} className="flex items-center gap-3 rounded-lg border border-border bg-card p-3">
                  <MemberAvatar name={o.name} tone={2 + (i % 5)} />
                  <span className="min-w-0 flex-1"><span className="block truncate text-base font-medium">{o.name}</span><span className="text-sm text-muted-foreground">{RELATION_LABEL[o.relation]}</span></span>
                  <Button variant="ghost" size="icon-sm" aria-label={`Remove ${o.name}`} onClick={() => setOthers(others.filter((_, j) => j !== i))}><Trash2 aria-hidden="true" /></Button>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      {step === 3 && (
        <section className="flex flex-col gap-5">
          <div className="space-y-2">
            <h1 className="text-[1.75rem] leading-tight font-semibold">Choose roles</h1>
            <p className="text-base text-muted-foreground">Roles decide what each person can do once they sign in. You can change them any time.</p>
          </div>
          <ul className="grid gap-2 sm:grid-cols-2">
            {ROLES.map((r) => <li key={r} className="flex flex-col gap-1.5 rounded-lg border border-border bg-surface p-3"><RoleBadge role={r} size="sm" /><span className="text-sm text-muted-foreground">{ROLE_SUMMARY[r]}</span></li>)}
          </ul>
          <ul className="flex flex-col gap-2">
            <li className="flex items-center gap-3 rounded-lg border border-border bg-card p-3">
              <MemberAvatar name={userName} tone={1} />
              <span className="flex-1 text-base font-medium">{userName} (you)</span>
              <RoleBadge role="admin" />
            </li>
            {others.map((o, i) => (
              <li key={i} className="flex flex-wrap items-center gap-3 rounded-lg border border-border bg-card p-3">
                <MemberAvatar name={o.name} tone={2 + (i % 5)} />
                <span className="min-w-0 flex-1"><span className="block truncate text-base font-medium">{o.name}</span><span className="text-sm text-muted-foreground">{RELATION_LABEL[o.relation]}</span></span>
                <label className="w-44">
                  <span className="sr-only">Role for {o.name}</span>
                  <NativeSelect size="sm" value={o.role} onChange={(e) => setOthers(others.map((x, j) => (j === i ? { ...x, role: e.target.value as Role } : x)))}>
                    {ROLES.map((r) => <NativeSelectOption key={r} value={r}>{ROLE_LABEL[r]}</NativeSelectOption>)}
                  </NativeSelect>
                </label>
              </li>
            ))}
          </ul>
          {error && <p role="alert" className="text-sm font-medium text-danger">{error}</p>}
        </section>
      )}

      <div className="flex items-center justify-between gap-3 border-t border-border pt-6">
        <Button variant="ghost" onClick={() => { setError(null); if (step === 0) setMode("choose"); else setStep(step - 1); }}><ArrowLeft aria-hidden="true" /> Back</Button>
        {step < STEPS.length - 1 ? (
          <Button size="lg" onClick={() => { if (step === 0 && familyName.trim().length < 2) { setError("Give your family a name"); return; } setError(null); setStep(step + 1); }}>
            {step === 2 && others.length === 0 ? "Skip for now" : "Continue"} <ArrowRight aria-hidden="true" />
          </Button>
        ) : (
          <Button size="lg" onClick={finish} disabled={pending}>{pending ? "Setting up…" : "Finish and open dashboard"} <Check aria-hidden="true" /></Button>
        )}
      </div>
      {step === 0 && error && <p role="alert" className="-mt-4 text-sm font-medium text-danger">{error}</p>}
    </div>
  );
}
