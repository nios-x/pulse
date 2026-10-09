"use client";

import Link from "next/link";
import { useActionState } from "react";
import { ArrowRight } from "lucide-react";
import { signUpAction, type AuthState } from "@/app/actions/auth";
import { PasswordInput } from "@/components/auth/password-input";
import { describedBy, Field } from "@/components/form/field";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";

export function SignUpForm({ invite }: { invite?: string }) {
  const [state, action, pending] = useActionState<AuthState, FormData>(signUpAction, undefined);
  const fe = state?.fieldErrors ?? {};
  return (
    <form action={action} className="flex flex-col gap-5" noValidate>
      {state?.error && (
        <p role="alert" className="rounded-lg border border-danger-border bg-danger-soft px-4 py-3 text-[0.9375rem] text-danger">
          {state.error}
        </p>
      )}
      <Field label="Your name" htmlFor="name" error={fe.name}>
        <Input id="name" name="name" autoComplete="name" required defaultValue={state?.values?.name} {...describedBy("name", fe.name)} />
      </Field>
      <Field label="Email" htmlFor="email" error={fe.email}>
        <Input id="email" name="email" type="email" autoComplete="email" required defaultValue={state?.values?.email} {...describedBy("email", fe.email)} />
      </Field>
      <Field label="Password" htmlFor="password" error={fe.password} hint="At least 8 characters">
        <PasswordInput id="password" name="password" autoComplete="new-password" required {...describedBy("password", fe.password, true)} />
      </Field>
      <Field label="Invite code" htmlFor="invite" optional hint="Got a code from family? Enter it to join them straight away." error={fe.invite}>
        <Input id="invite" name="invite" autoComplete="off" className="uppercase tracking-[0.2em]" maxLength={8} defaultValue={invite ?? state?.values?.invite} {...describedBy("invite", fe.invite, true)} />
      </Field>
      <div className="flex flex-col gap-2">
        <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-border bg-card p-3.5 text-[0.9375rem] leading-snug">
          <Checkbox name="consent" value="on" className="mt-0.5" aria-describedby={fe.consent ? "consent-error" : undefined} />
          <span>
            I agree that Pulse stores my family&apos;s health information to help us manage it. Records are encrypted, nothing is shared without my
            consent, and I can delete our data at any time.
          </span>
        </label>
        {fe.consent && (
          <p id="consent-error" role="alert" className="text-sm font-medium text-danger">
            {fe.consent}
          </p>
        )}
      </div>
      <Button type="submit" size="lg" disabled={pending} className="w-full">
        {pending ? "Creating your account…" : "Create account"}
        {!pending && <ArrowRight aria-hidden="true" />}
      </Button>
      <p className="text-center text-[0.9375rem] text-muted-foreground">
        Already have an account?{" "}
        <Link href="/sign-in" className="font-medium text-primary underline-offset-4 hover:underline">
          Sign in
        </Link>
      </p>
    </form>
  );
}
