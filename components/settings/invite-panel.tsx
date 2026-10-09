"use client";

import { useState, useTransition } from "react";
import { Copy, Mail, MessageCircle, Send, X } from "lucide-react";
import { toast } from "sonner";
import { createInvite, revokeInvite } from "@/app/actions/family";
import { describedBy, Field } from "@/components/form/field";
import { RoleBadge } from "@/components/health/role-badge";
import { RoleGate } from "@/components/health/role-gate";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import type { Role } from "@/db/schema";
import { ROLE_LABEL, ROLE_SUMMARY, ROLES } from "@/lib/permissions";

export type PanelInvite = { id: string; code: string; role: Role; email: string | null; memberName: string | null; expires: string };

export function InvitePanel({ invites, profiles, presetMemberId, origin }: { invites: PanelInvite[]; profiles: { id: string; name: string }[]; presetMemberId?: string | null; origin: string }) {
  const [role, setRole] = useState<Role>("caregiver");
  const [memberId, setMemberId] = useState(presetMemberId ?? "");
  const [email, setEmail] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [created, setCreated] = useState<{ code: string; url: string } | null>(null);
  const [pending, start] = useTransition();

  const submit = () =>
    start(async () => {
      const res = await createInvite({ role, memberId, email });
      if (res.ok && res.data) {
        setCreated({ code: res.data.code, url: res.data.url });
        setErrors({});
        setEmail("");
        toast.success(res.message);
      } else if (!res.ok) {
        setErrors(res.fieldErrors ?? {});
        toast.error(res.error);
      }
    });

  const copy = async (text: string, what: string) => {
    await navigator.clipboard.writeText(text);
    toast.success(`${what} copied`);
  };

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
      <section className="flex flex-col gap-5 rounded-xl border border-border bg-card p-5 sm:p-6">
        <div>
          <h3 className="text-lg font-semibold">Invite someone</h3>
          <p className="text-[0.9375rem] text-muted-foreground">They sign up with the code and join with the role you choose. Codes work once, for 7 days.</p>
        </div>
        <form action={submit} className="flex flex-col gap-4">
          <Field label="Role" htmlFor="inv-role" hint={ROLE_SUMMARY[role]}>
            <NativeSelect id="inv-role" value={role} onChange={(e) => setRole(e.target.value as Role)}>
              {ROLES.map((r) => <NativeSelectOption key={r} value={r}>{ROLE_LABEL[r]}</NativeSelectOption>)}
            </NativeSelect>
          </Field>
          <Field label="Link to an existing profile" htmlFor="inv-member" optional hint="e.g. give Papa a login to his own profile">
            <NativeSelect id="inv-member" value={memberId} onChange={(e) => setMemberId(e.target.value)}>
              <NativeSelectOption value="">New profile (they fill it in)</NativeSelectOption>
              {profiles.map((p) => <NativeSelectOption key={p.id} value={p.id}>{p.name}</NativeSelectOption>)}
            </NativeSelect>
          </Field>
          <Field label="Their email" htmlFor="inv-email" optional hint="We'll email the invite. Leave empty to share the code yourself." error={errors.email}>
            <Input id="inv-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} {...describedBy("inv-email", errors.email, true)} />
          </Field>
          <RoleGate action="family.manage">
            <Button type="submit" disabled={pending} className="w-full sm:w-fit">
              {email ? <Send aria-hidden="true" /> : <Mail aria-hidden="true" />} {pending ? "Creating…" : email ? "Send invite" : "Create invite code"}
            </Button>
          </RoleGate>
        </form>
        {created && (
          <div className="flex flex-col gap-3 rounded-xl border border-primary/40 bg-accent/50 p-4" aria-live="polite">
            <p className="text-sm font-medium text-muted-foreground">Invite code</p>
            <p className="font-mono text-3xl font-semibold tracking-[0.3em]">{created.code}</p>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" onClick={() => copy(created.url, "Invite link")}><Copy aria-hidden="true" /> Copy link</Button>
              <a
                className="inline-flex h-10 items-center gap-2 rounded-lg border border-border-strong bg-card px-3 text-sm font-medium hover:bg-muted"
                href={`https://wa.me/?text=${encodeURIComponent(`Join our family on Pulse to manage everyone's health. Code: ${created.code} ${created.url}`)}`}
                target="_blank"
                rel="noreferrer"
              >
                <MessageCircle className="size-4" aria-hidden="true" /> Share on WhatsApp
              </a>
            </div>
          </div>
        )}
      </section>

      <section className="flex flex-col gap-3">
        <h3 className="text-lg font-semibold">Open invites</h3>
        {invites.length === 0 ? (
          <p className="rounded-xl border border-dashed border-border-strong p-6 text-center text-base text-muted-foreground">No open invites.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {invites.map((i) => (
              <li key={i.id} className="flex items-center gap-3 rounded-xl border border-border bg-card p-4">
                <div className="min-w-0 flex-1 space-y-1">
                  <p className="font-mono text-lg font-semibold tracking-[0.2em]">{i.code}</p>
                  <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                    <RoleBadge role={i.role} size="sm" />
                    {i.memberName && <span>for {i.memberName}</span>}
                    {i.email && <span>· {i.email}</span>}
                    <span>· until {i.expires}</span>
                  </div>
                </div>
                <Button variant="ghost" size="icon-sm" aria-label={`Copy invite link ${i.code}`} onClick={() => copy(`${origin}/sign-up?invite=${i.code}`, "Invite link")}><Copy aria-hidden="true" /></Button>
                <RoleGate action="family.manage" mode="hide">
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label={`Cancel invite ${i.code}`}
                    onClick={() => start(async () => { const r = await revokeInvite(i.id); if (r.ok) toast.success(r.message); else toast.error(r.error); })}
                  >
                    <X aria-hidden="true" />
                  </Button>
                </RoleGate>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
