"use client";

import { useState, useTransition } from "react";
import { BellRing, Download, ExternalLink, MailCheck } from "lucide-react";
import { toast } from "sonner";
import { changePassword, runNotificationsNow, sendTestEmail, updateAccount } from "@/app/actions/family";
import { PasswordInput } from "@/components/auth/password-input";
import { describedBy, Field } from "@/components/form/field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";

export function AccountPanel({ user, mailMode, canExport }: { user: { name: string; email: string; phone: string | null; emailReminders: boolean; dailyDigest: boolean }; mailMode: string; canExport: boolean }) {
  const [reminders, setReminders] = useState(user.emailReminders);
  const [digest, setDigest] = useState(user.dailyDigest);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [preview, setPreview] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const save = (f: FormData) =>
    start(async () => {
      const res = await updateAccount({ name: f.get("name"), phone: f.get("phone"), emailReminders: reminders, dailyDigest: digest });
      if (res.ok) toast.success(res.message);
      else { setErrors(res.fieldErrors ?? {}); toast.error(res.error); }
    });

  const savePassword = (f: FormData, form: HTMLFormElement) =>
    start(async () => {
      const res = await changePassword({ current: f.get("current"), next: f.get("next") });
      if (res.ok) { toast.success(res.message); form.reset(); setErrors({}); }
      else { setErrors(res.fieldErrors ?? {}); toast.error(res.error); }
    });

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <section className="flex flex-col gap-5 rounded-xl border border-border bg-card p-5 sm:p-6">
        <h3 className="text-lg font-semibold">Your details</h3>
        <form action={save} className="flex flex-col gap-4">
          <Field label="Name" htmlFor="acc-name" error={errors.name}>
            <Input id="acc-name" name="name" defaultValue={user.name} required {...describedBy("acc-name", errors.name)} />
          </Field>
          <Field label="Email" htmlFor="acc-email" hint="Used to sign in. Contact support to change it.">
            <Input id="acc-email" value={user.email} readOnly disabled />
          </Field>
          <Field label="Phone" htmlFor="acc-phone" optional>
            <Input id="acc-phone" name="phone" type="tel" defaultValue={user.phone ?? ""} />
          </Field>
          <fieldset className="flex flex-col gap-3 rounded-lg border border-border p-4">
            <legend className="px-1 text-[0.9375rem] font-medium">Email notifications</legend>
            <label className="flex cursor-pointer items-start justify-between gap-4">
              <span><span className="block text-base">Dose reminders and alerts</span><span className="block text-sm text-muted-foreground">At dose time, missed doses, high readings, refills</span></span>
              <Switch checked={reminders} onCheckedChange={setReminders} aria-label="Dose reminders and alerts" />
            </label>
            <label className="flex cursor-pointer items-start justify-between gap-4">
              <span><span className="block text-base">Morning summary</span><span className="block text-sm text-muted-foreground">Yesterday&apos;s doses, today&apos;s appointments and refills, at 7 am</span></span>
              <Switch checked={digest} onCheckedChange={setDigest} aria-label="Morning summary email" />
            </label>
          </fieldset>
          <Button type="submit" disabled={pending} className="w-fit">Save</Button>
        </form>
      </section>

      <div className="flex flex-col gap-6">
        <section className="flex flex-col gap-4 rounded-xl border border-border bg-card p-5 sm:p-6">
          <h3 className="text-lg font-semibold">Test email delivery</h3>
          <p className="text-[0.9375rem] text-muted-foreground">
            Mode: <span className="font-medium text-foreground">{mailMode === "smtp" ? "SMTP (real emails)" : mailMode === "ethereal" ? "Ethereal test inbox" : "Log only (no SMTP set)"}</span>
          </p>
          <Button
            variant="outline"
            className="w-fit"
            disabled={pending}
            onClick={() => start(async () => { const r = await sendTestEmail(); if (r.ok) { toast.success(r.message); setPreview(r.data?.previewUrl ?? null); } else toast.error(r.error); })}
          >
            <MailCheck aria-hidden="true" /> Send me a test email
          </Button>
          {canExport && (
            <>
              <Button
                variant="outline"
                className="w-fit"
                disabled={pending}
                onClick={() => start(async () => { const r = await runNotificationsNow(); if (r.ok) toast.success(r.message, { description: r.data?.summary }); else toast.error(r.error); })}
              >
                <BellRing aria-hidden="true" /> Run reminder check now
              </Button>
              <p className="text-sm text-muted-foreground">Normally runs on a schedule (every 15 minutes, and a 7 am summary).</p>
            </>
          )}
          {preview && <a href={preview} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-[0.9375rem] font-medium text-primary underline-offset-4 hover:underline">Open the email preview <ExternalLink className="size-4" aria-hidden="true" /></a>}
        </section>

        <section className="flex flex-col gap-4 rounded-xl border border-border bg-card p-5 sm:p-6">
          <h3 className="text-lg font-semibold">Change password</h3>
          <form onSubmit={(e) => { e.preventDefault(); savePassword(new FormData(e.currentTarget), e.currentTarget); }} className="flex flex-col gap-4">
            <Field label="Current password" htmlFor="pw-cur" error={errors.current}>
              <PasswordInput id="pw-cur" name="current" autoComplete="current-password" {...describedBy("pw-cur", errors.current)} />
            </Field>
            <Field label="New password" htmlFor="pw-new" error={errors.next} hint="At least 8 characters">
              <PasswordInput id="pw-new" name="next" autoComplete="new-password" {...describedBy("pw-new", errors.next, true)} />
            </Field>
            <Button type="submit" variant="outline" disabled={pending} className="w-fit">Change password</Button>
          </form>
        </section>

        {canExport && (
          <section className="flex flex-col gap-3 rounded-xl border border-border bg-card p-5 sm:p-6">
            <h3 className="text-lg font-semibold">Your data</h3>
            <p className="text-[0.9375rem] text-muted-foreground">Download everything the family has stored, as a JSON file. Record files stay encrypted on the server.</p>
            <a href="/api/export" className="inline-flex h-11 w-fit items-center gap-2 rounded-lg border border-border-strong px-4 text-base font-medium hover:bg-muted"><Download className="size-[1.125rem]" aria-hidden="true" /> Download family data</a>
          </section>
        )}
      </div>
    </div>
  );
}
