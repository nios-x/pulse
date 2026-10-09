"use client";

import { useState, useTransition } from "react";
import { Copy, Eye, Link2, Plus, ShieldOff } from "lucide-react";
import { toast } from "sonner";
import { createShareLink, revokeShareLink } from "@/app/actions/share";
import { Field } from "@/components/form/field";
import { Segmented } from "@/components/form/segmented";
import { StatusBadge } from "@/components/health/status-badge";
import { useAccess } from "@/components/providers/access-provider";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";

export type PanelLink = {
  id: string;
  memberId: string;
  memberName: string;
  scope: "emergency" | "summary" | "records";
  label: string | null;
  status: "active" | "expired" | "revoked";
  expires: string;
  views: number;
  lastViewed: string | null;
  url: string;
};

const SCOPES = [
  { value: "summary" as const, label: "Health summary", hint: "Medicines, vitals, allergies, conditions" },
  { value: "records" as const, label: "Summary + records", hint: "Adds reports and prescriptions" },
  { value: "emergency" as const, label: "Emergency card", hint: "Only the emergency card" },
];

const DURATIONS = [
  { value: "24", label: "24 hours" },
  { value: "72", label: "3 days" },
  { value: "168", label: "7 days" },
  { value: "720", label: "30 days" },
];

export function SharingPanel({ links, members }: { links: PanelLink[]; members: { id: string; name: string }[] }) {
  const { can } = useAccess();
  const allowed = members.filter((m) => can("sharing.manage", m.id));
  const [open, setOpen] = useState(false);
  const [scope, setScope] = useState<"summary" | "records" | "emergency">("summary");
  const [hours, setHours] = useState("72");
  const [consent, setConsent] = useState(false);
  const [url, setUrl] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const submit = (f: FormData) =>
    start(async () => {
      const res = await createShareLink({ memberId: f.get("memberId"), label: f.get("label") || undefined, scope, hours, consent: consent ? "on" : "" });
      if (res.ok && res.data) {
        setUrl(res.data.url);
        toast.success(res.message);
      } else if (!res.ok) toast.error(res.fieldErrors?.consent ?? res.error);
    });

  const copy = async (u: string) => {
    await navigator.clipboard.writeText(u);
    toast.success("Link copied");
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <p className="max-w-2xl text-[0.9375rem] text-muted-foreground">Share with a doctor without giving them an account. Every link expires on its own, shows how often it was opened, and can be turned off at any time.</p>
        <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) { setUrl(null); setConsent(false); } }}>
          <DialogTrigger disabled={!allowed.length} render={<Button><Plus aria-hidden="true" /> New share link</Button>} />
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Share with a doctor</DialogTitle>
              <DialogDescription>Create a private link that stops working on its own.</DialogDescription>
            </DialogHeader>
            {url ? (
              <div className="flex flex-col gap-4">
                <div className="rounded-lg border border-primary/40 bg-accent/50 p-4">
                  <p className="text-sm text-muted-foreground">Share link</p>
                  <p className="mt-1 font-mono text-sm break-all">{url}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button onClick={() => copy(url)}><Copy aria-hidden="true" /> Copy link</Button>
                  <a className="inline-flex h-11 items-center gap-2 rounded-lg border border-border-strong px-4 text-base font-medium hover:bg-muted" href={`https://wa.me/?text=${encodeURIComponent(url)}`} target="_blank" rel="noreferrer">Send on WhatsApp</a>
                </div>
              </div>
            ) : (
              <form action={submit} className="flex flex-col gap-4">
                <Field label="Whose information?" htmlFor="s-member">
                  <NativeSelect id="s-member" name="memberId">
                    {allowed.map((m) => <NativeSelectOption key={m.id} value={m.id}>{m.name}</NativeSelectOption>)}
                  </NativeSelect>
                </Field>
                <fieldset>
                  <legend className="mb-2 text-[0.9375rem] font-medium">What to share</legend>
                  <div className="flex flex-col gap-2">
                    {SCOPES.map((s) => (
                      <label key={s.value} className="flex min-h-14 cursor-pointer items-center gap-3 rounded-lg border border-border px-3.5 py-2 has-[:checked]:border-primary has-[:checked]:bg-accent/50 has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-ring">
                        <input type="radio" name="scope" value={s.value} checked={scope === s.value} onChange={() => setScope(s.value)} className="size-4 accent-[var(--primary)]" />
                        <span><span className="block text-base font-medium">{s.label}</span><span className="block text-sm text-muted-foreground">{s.hint}</span></span>
                      </label>
                    ))}
                  </div>
                </fieldset>
                <fieldset>
                  <legend className="mb-2 text-[0.9375rem] font-medium">Link works for</legend>
                  <Segmented name="hours" label="Link works for" value={hours} onChange={setHours} options={DURATIONS} />
                </fieldset>
                <Field label="Label" htmlFor="s-label" optional hint="So you remember who it's for">
                  <Input id="s-label" name="label" placeholder="e.g. For Dr. Farah Khan" maxLength={80} />
                </Field>
                <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-border bg-surface p-3.5 text-[0.9375rem] leading-snug">
                  <Checkbox checked={consent} onCheckedChange={(v) => setConsent(Boolean(v))} className="mt-0.5" />
                  <span>I have this person&apos;s consent (or I am their guardian) to share this information with the person I send the link to.</span>
                </label>
                <Button type="submit" disabled={pending || !consent}>{pending ? "Creating…" : "Create link"}</Button>
              </form>
            )}
          </DialogContent>
        </Dialog>
      </div>
      {links.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border-strong p-8 text-center text-base text-muted-foreground">No share links yet.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {links.map((l) => (
            <li key={l.id} className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4 sm:flex-row sm:items-center">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-accent text-accent-foreground"><Link2 className="size-5" aria-hidden="true" /></span>
              <div className="min-w-0 flex-1 space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-base font-semibold">{l.label ?? "Share link"}</p>
                  {l.status === "active" ? <StatusBadge tone="success" label="Active" size="sm" /> : l.status === "expired" ? <StatusBadge tone="neutral" label="Expired" size="sm" /> : <StatusBadge tone="neutral" icon={ShieldOff} label="Turned off" size="sm" />}
                </div>
                <p className="text-sm text-muted-foreground">
                  {l.memberName} · {SCOPES.find((s) => s.value === l.scope)?.label} · {l.status === "active" ? "until" : "ended"} {l.expires}
                </p>
                <p className="inline-flex items-center gap-1.5 text-sm text-muted-foreground"><Eye className="size-4" aria-hidden="true" /> Opened {l.views} time{l.views === 1 ? "" : "s"}{l.lastViewed ? `, last ${l.lastViewed}` : ""}</p>
              </div>
              {l.status === "active" && (
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => copy(l.url)}><Copy aria-hidden="true" /> Copy</Button>
                  {can("sharing.manage", l.memberId) && (
                    <Button variant="destructive-outline" size="sm" disabled={pending} onClick={() => start(async () => { const r = await revokeShareLink(l.id); if (r.ok) toast.success(r.message); else toast.error(r.error); })}>
                      Turn off
                    </Button>
                  )}
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
