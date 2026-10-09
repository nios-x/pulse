"use client";

import { useActionState } from "react";
import { ArrowRight } from "lucide-react";
import { signUpDoctorAction, type AuthState } from "@/app/actions/auth";
import { PasswordInput } from "@/components/auth/password-input";
import { describedBy, Field } from "@/components/form/field";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";

export function DoctorSignUpForm() {
  const [state, action, pending] = useActionState<AuthState, FormData>(signUpDoctorAction, undefined);
  const fe = state?.fieldErrors ?? {};
  const v = state?.values ?? {};
  return (
    <form action={action} className="flex flex-col gap-5" noValidate>
      <Field label="Full name" htmlFor="d-name" error={fe.name}><Input id="d-name" name="name" autoComplete="name" placeholder="Dr. Anjali Deshpande" defaultValue={v.name} {...describedBy("d-name", fe.name)} /></Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Email" htmlFor="d-email" error={fe.email}><Input id="d-email" name="email" type="email" autoComplete="email" defaultValue={v.email} {...describedBy("d-email", fe.email)} /></Field>
        <Field label="Password" htmlFor="d-password" error={fe.password} hint="At least 8 characters"><PasswordInput id="d-password" name="password" autoComplete="new-password" {...describedBy("d-password", fe.password, true)} /></Field>
        <Field label="Speciality" htmlFor="d-spec" error={fe.specialty}><Input id="d-spec" name="specialty" placeholder="General Physician" defaultValue={v.specialty} {...describedBy("d-spec", fe.specialty)} /></Field>
        <Field label="Registration number" htmlFor="d-reg" error={fe.registrationNo}><Input id="d-reg" name="registrationNo" placeholder="MMC 2010/01/1234" defaultValue={v.registrationNo} {...describedBy("d-reg", fe.registrationNo)} /></Field>
        <Field label="Clinic or hospital" htmlFor="d-clinic" error={fe.clinic}><Input id="d-clinic" name="clinic" defaultValue={v.clinic} {...describedBy("d-clinic", fe.clinic)} /></Field>
        <Field label="City" htmlFor="d-city" error={fe.city}><Input id="d-city" name="city" defaultValue={v.city} {...describedBy("d-city", fe.city)} /></Field>
        <Field label="Fee (₹)" htmlFor="d-fee" error={fe.fee}><Input id="d-fee" name="fee" inputMode="numeric" defaultValue={v.fee ?? "500"} /></Field>
        <Field label="Languages" htmlFor="d-lang" hint="Separate with commas"><Input id="d-lang" name="languages" defaultValue={v.languages ?? "English, Hindi"} /></Field>
      </div>
      <label className="flex cursor-pointer items-center gap-3 text-[0.9375rem]"><Checkbox name="teleconsult" value="on" defaultChecked /> I offer video consults</label>
      <div className="flex flex-col gap-2">
        <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-border bg-card p-3.5 text-[0.9375rem] leading-snug">
          <Checkbox name="consent" value="on" className="mt-0.5" />
          <span>I confirm I am a registered medical practitioner, and I&apos;ll only view patient information that families choose to share with me.</span>
        </label>
        {fe.consent && <p role="alert" className="text-sm font-medium text-danger">{fe.consent}</p>}
      </div>
      <Button type="submit" variant="brand" size="lg" disabled={pending} className="w-full">{pending ? "Creating your account…" : "Create doctor account"} {!pending && <ArrowRight aria-hidden="true" />}</Button>
    </form>
  );
}
