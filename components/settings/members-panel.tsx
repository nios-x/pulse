"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { HeartHandshake, KeyRound, Plus, Trash2, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { removeMember, saveMember, setAssignments, setRole } from "@/app/actions/members";
import { describedBy, Field } from "@/components/form/field";
import { MemberAvatar } from "@/components/health/member-avatar";
import { RoleBadge } from "@/components/health/role-badge";
import { RoleGate } from "@/components/health/role-gate";
import { useAccess } from "@/components/providers/access-provider";
import { Button, buttonVariants } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import type { Relation, Role } from "@/db/schema";
import { BLOOD_GROUPS, RELATION_LABEL } from "@/lib/labels";
import { ROLE_LABEL, ROLE_SUMMARY, ROLES } from "@/lib/permissions";

export type PanelMember = {
  id: string;
  name: string;
  relation: Relation;
  relationLabel: string;
  role: Role;
  avatarTone: number;
  email: string | null;
  hasLogin: boolean;
  isMe: boolean;
  age: number | null;
  assignedMemberIds: string[];
};

export function MembersPanel({ members }: { members: PanelMember[] }) {
  const { can, reason } = useAccess();
  const manage = can("family.manage");
  const [pending, start] = useTransition();

  const run = (fn: () => Promise<{ ok: boolean; message?: string; error?: string }>) =>
    start(async () => {
      const res = await fn();
      if (res.ok) toast.success(res.message ?? "Saved");
      else toast.error(res.error);
    });

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-[0.9375rem] text-muted-foreground">{members.length} people. Profiles without a login are managed by the family (for example, children).</p>
        <RoleGate action="member.add">
          <AddMemberDialog />
        </RoleGate>
      </div>
      <ul className="flex flex-col divide-y divide-border rounded-xl border border-border bg-card">
        {members.map((m) => (
          <li key={m.id} className="flex flex-col gap-4 p-4 sm:p-5 lg:flex-row lg:items-center">
            <div className="flex min-w-0 flex-1 items-center gap-3">
              <MemberAvatar name={m.name} tone={m.avatarTone} size="md" />
              <div className="min-w-0">
                <p className="truncate text-base font-semibold">{m.name}{m.isMe && <span className="ml-2 text-sm font-normal text-muted-foreground">(you)</span>}</p>
                <p className="truncate text-sm text-muted-foreground">
                  {m.relationLabel}{m.age != null ? ` · ${m.age} yrs` : ""} · {m.hasLogin ? m.email : "No login"}
                </p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {m.hasLogin ? (
                manage && !m.isMe ? (
                  <label className="flex items-center gap-2 text-sm">
                    <span className="sr-only">Role for {m.name}</span>
                    <NativeSelect size="sm" value={m.role} disabled={pending} onChange={(e) => run(() => setRole({ memberId: m.id, role: e.target.value }))} className="w-40">
                      {ROLES.map((r) => <NativeSelectOption key={r} value={r}>{ROLE_LABEL[r]}</NativeSelectOption>)}
                    </NativeSelect>
                  </label>
                ) : (
                  <RoleBadge role={m.role} />
                )
              ) : (
                <RoleGate action="family.manage">
                  <Link href={`/settings?tab=invites&member=${m.id}`} className={buttonVariants({ variant: "outline", size: "sm" })}>
                    <KeyRound aria-hidden="true" /> Give a login
                  </Link>
                </RoleGate>
              )}
              {m.role === "caregiver" && m.hasLogin && (
                <AssignPopover member={m} members={members} disabled={!manage} reason={reason("family.manage")} />
              )}
              {manage && !m.isMe && (
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label={`Remove ${m.name}`}
                  className="text-danger hover:bg-danger-soft"
                  disabled={pending}
                  onClick={() => {
                    if (confirm(`Remove ${m.name} and all their health records? This can't be undone.`)) run(() => removeMember(m.id));
                  }}
                >
                  <Trash2 aria-hidden="true" />
                </Button>
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

function AssignPopover({ member, members, disabled, reason }: { member: PanelMember; members: PanelMember[]; disabled: boolean; reason: string | null }) {
  const [selected, setSelected] = useState(member.assignedMemberIds);
  const [pending, start] = useTransition();
  const others = members.filter((m) => m.id !== member.id);
  const names = others.filter((o) => member.assignedMemberIds.includes(o.id)).map((o) => o.name.split(" ")[0]);
  return (
    <Popover>
      <PopoverTrigger disabled={disabled} title={disabled ? reason ?? undefined : undefined} className="inline-flex min-h-10 cursor-pointer items-center gap-2 rounded-lg border border-border-strong bg-card px-3 text-sm font-medium hover:bg-muted disabled:cursor-not-allowed disabled:opacity-60">
        <HeartHandshake className="size-4 text-role-caregiver" aria-hidden="true" />
        {names.length ? `Looks after ${names.join(", ")}` : "Assign people"}
      </PopoverTrigger>
      <PopoverContent align="end" className="w-72">
        <p className="mb-2 text-base font-semibold">{member.name.split(" ")[0]} looks after</p>
        <p className="mb-3 text-sm text-muted-foreground">Caregivers can update medicines and appointments only for these people.</p>
        <ul className="mb-3 flex flex-col gap-1">
          {others.map((o) => (
            <li key={o.id}>
              <label className="flex min-h-11 cursor-pointer items-center gap-3 rounded-md px-2 hover:bg-muted">
                <Checkbox checked={selected.includes(o.id)} onCheckedChange={(v) => setSelected(v ? [...selected, o.id] : selected.filter((x) => x !== o.id))} />
                <MemberAvatar name={o.name} tone={o.avatarTone} size="sm" />
                <span className="text-[0.9375rem]">{o.name}</span>
              </label>
            </li>
          ))}
        </ul>
        <Button
          className="w-full"
          disabled={pending}
          onClick={() =>
            start(async () => {
              const res = await setAssignments({ memberId: member.id, assigned: selected });
              if (res.ok) toast.success(res.message);
              else toast.error(res.error);
            })
          }
        >
          Save
        </Button>
      </PopoverContent>
    </Popover>
  );
}

export function AddMemberDialog({ trigger }: { trigger?: React.ReactElement }) {
  const [open, setOpen] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [pending, start] = useTransition();
  const submit = (f: FormData) =>
    start(async () => {
      const res = await saveMember(Object.fromEntries(f));
      if (res.ok) { toast.success(res.message); setOpen(false); setErrors({}); }
      else { setErrors(res.fieldErrors ?? {}); toast.error(res.error); }
    });
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={trigger ?? <Button><UserPlus aria-hidden="true" /> Add family member</Button>} />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add a family member</DialogTitle>
          <DialogDescription>Create a health profile. You can give them a login later with an invite.</DialogDescription>
        </DialogHeader>
        <form action={submit} className="grid gap-4 sm:grid-cols-2">
          <Field label="Full name" htmlFor="am-name" error={errors.name} className="sm:col-span-2">
            <Input id="am-name" name="name" required {...describedBy("am-name", errors.name)} />
          </Field>
          <Field label="Relation to you" htmlFor="am-rel">
            <NativeSelect id="am-rel" name="relation" defaultValue="parent">
              {(Object.keys(RELATION_LABEL) as Relation[]).filter((r) => r !== "self").map((r) => <NativeSelectOption key={r} value={r}>{RELATION_LABEL[r]}</NativeSelectOption>)}
            </NativeSelect>
          </Field>
          <Field label="Role when they sign in" htmlFor="am-role" hint={ROLE_SUMMARY.member}>
            <NativeSelect id="am-role" name="role" defaultValue="member">
              {ROLES.map((r) => <NativeSelectOption key={r} value={r}>{ROLE_LABEL[r]}</NativeSelectOption>)}
            </NativeSelect>
          </Field>
          <Field label="Date of birth" htmlFor="am-dob" error={errors.dateOfBirth}>
            <Input id="am-dob" name="dateOfBirth" type="date" />
          </Field>
          <Field label="Sex" htmlFor="am-sex">
            <NativeSelect id="am-sex" name="sex" defaultValue="">
              <NativeSelectOption value="">Prefer not to say</NativeSelectOption>
              <NativeSelectOption value="female">Female</NativeSelectOption>
              <NativeSelectOption value="male">Male</NativeSelectOption>
              <NativeSelectOption value="other">Other</NativeSelectOption>
            </NativeSelect>
          </Field>
          <Field label="Blood group" htmlFor="am-blood">
            <NativeSelect id="am-blood" name="bloodGroup" defaultValue="">
              <NativeSelectOption value="">Not known</NativeSelectOption>
              {BLOOD_GROUPS.map((b) => <NativeSelectOption key={b} value={b}>{b}</NativeSelectOption>)}
            </NativeSelect>
          </Field>
          <Field label="Height (cm)" htmlFor="am-height" optional error={errors.heightCm}>
            <Input id="am-height" name="heightCm" inputMode="numeric" />
          </Field>
          <div className="flex flex-col-reverse gap-2 sm:col-span-2 sm:flex-row sm:justify-end">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={pending}><Plus aria-hidden="true" /> {pending ? "Adding…" : "Add member"}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
