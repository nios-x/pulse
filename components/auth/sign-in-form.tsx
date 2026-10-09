"use client";

import { useActionState, useRef } from "react";
import { ArrowRight } from "lucide-react";
import { signInAction, type AuthState } from "@/app/actions/auth";
import { PasswordInput } from "@/components/auth/password-input";
import { describedBy, Field } from "@/components/form/field";
import { RoleBadge } from "@/components/health/role-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const DEMO = [
  { email: "rahul@pulse.demo", name: "Rahul", role: "admin" as const },
  { email: "priya@pulse.demo", name: "Priya", role: "caregiver" as const },
  { email: "suresh@pulse.demo", name: "Suresh", role: "member" as const },
  { email: "kamala@pulse.demo", name: "Kamala", role: "viewer" as const },
];

const DOCTORS = [
  { email: "anjali@pulse.demo", name: "Dr. Anjali", detail: "Family physician" },
  { email: "farah@pulse.demo", name: "Dr. Farah", detail: "Endocrinologist" },
];

export function SignInForm({ next }: { next?: string }) {
  const [state, action, pending] = useActionState<AuthState, FormData>(signInAction, undefined);
  const formRef = useRef<HTMLFormElement>(null);
  const fe = state?.fieldErrors ?? {};

  const demo = (email: string) => {
    const form = formRef.current;
    if (!form) return;
    (form.elements.namedItem("email") as HTMLInputElement).value = email;
    (form.elements.namedItem("password") as HTMLInputElement).value = "demo1234";
    form.requestSubmit();
  };

  return (
    <div className="flex flex-col gap-8">
      <form ref={formRef} action={action} className="flex flex-col gap-5" noValidate>
        <input type="hidden" name="next" value={next ?? ""} />
        {state?.error && (
          <p role="alert" className="rounded-lg border border-danger-border bg-danger-soft px-4 py-3 text-[0.9375rem] text-danger">
            {state.error}
          </p>
        )}
        <Field label="Email" htmlFor="email" error={fe.email}>
          <Input id="email" name="email" type="email" autoComplete="email" required defaultValue={state?.values?.email} {...describedBy("email", fe.email)} />
        </Field>
        <Field label="Password" htmlFor="password" error={fe.password}>
          <PasswordInput id="password" name="password" autoComplete="current-password" required {...describedBy("password", fe.password)} />
        </Field>
        <Button type="submit" size="lg" disabled={pending} className="mt-1 w-full">
          {pending ? "Signing in…" : "Sign in"}
          {!pending && <ArrowRight aria-hidden="true" />}
        </Button>
      </form>

      <section aria-labelledby="demo-heading" className="rounded-xl border border-dashed border-border-strong bg-surface/60 p-4">
        <h2 id="demo-heading" className="text-base font-semibold">
          Try the demo family
        </h2>
        <p className="mt-0.5 text-sm text-muted-foreground">The Mehtas of Pune. Synthetic data. Each person has a different role.</p>
        <div className="mt-3 grid grid-cols-2 gap-2">
          {DEMO.map((d) => (
            <button
              key={d.email}
              type="button"
              onClick={() => demo(d.email)}
              disabled={pending}
              className="flex min-h-14 cursor-pointer flex-col items-start justify-center gap-1 rounded-xl border border-border bg-card px-3 py-2 text-left transition-colors hover:border-border-strong hover:bg-muted disabled:opacity-60"
            >
              <span className="text-[0.9375rem] font-medium">{d.name}</span>
              <RoleBadge role={d.role} size="sm" />
            </button>
          ))}
        </div>
        <p className="mt-4 text-sm font-medium text-muted-foreground">Or see the doctor portal</p>
        <div className="mt-2 grid grid-cols-2 gap-2">
          {DOCTORS.map((d) => (
            <button key={d.email} type="button" onClick={() => demo(d.email)} disabled={pending} className="flex min-h-14 cursor-pointer flex-col items-start justify-center gap-0.5 rounded-xl border border-border bg-card px-3 py-2 text-left transition-colors hover:border-border-strong hover:bg-muted disabled:opacity-60">
              <span className="text-[0.9375rem] font-medium">{d.name}</span>
              <span className="text-xs text-muted-foreground">{d.detail}</span>
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}
