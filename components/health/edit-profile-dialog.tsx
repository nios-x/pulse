"use client";

import { useState, useTransition } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { saveHealthInfo, saveMember } from "@/app/actions/members";
import { describedBy, Field } from "@/components/form/field";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import type { Allergy, Condition, EmergencyContact, Member } from "@/db/schema";
import { BLOOD_GROUPS } from "@/lib/labels";

type Props = Pick<Member, "id" | "name" | "relation" | "role" | "dateOfBirth" | "sex" | "bloodGroup" | "heightCm" | "phone" | "allergies" | "conditions" | "emergencyContacts" | "notes">;

export function EditProfileDialog({ member }: { member: Props }) {
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [allergies, setAllergies] = useState<Allergy[]>(member.allergies);
  const [conditions, setConditions] = useState<Condition[]>(member.conditions);
  const [contacts, setContacts] = useState<EmergencyContact[]>(member.emergencyContacts);
  const [notes, setNotes] = useState(member.notes ?? "");

  const saveBasics = (f: FormData) =>
    start(async () => {
      const res = await saveMember({ id: member.id, relation: member.relation, role: member.role, ...Object.fromEntries(f) });
      if (res.ok) { toast.success(res.message); setErrors({}); setOpen(false); }
      else { setErrors(res.fieldErrors ?? {}); toast.error(res.error); }
    });

  const saveHealth = () =>
    start(async () => {
      const res = await saveHealthInfo({
        memberId: member.id,
        allergies: allergies.filter((a) => a.name.trim()),
        conditions: conditions.filter((c) => c.name.trim()),
        emergencyContacts: contacts.filter((c) => c.name.trim() && c.phone.trim()),
        notes,
      });
      if (res.ok) { toast.success(res.message); setOpen(false); }
      else toast.error(res.error);
    });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="outline"><Pencil aria-hidden="true" /> Edit profile</Button>} />
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Edit {member.name.split(" ")[0]}&apos;s profile</DialogTitle>
          <DialogDescription>These details appear on the emergency card. Keep them up to date.</DialogDescription>
        </DialogHeader>
        <Tabs defaultValue="health">
          <TabsList>
            <TabsTrigger value="health">Allergies &amp; conditions</TabsTrigger>
            <TabsTrigger value="contacts">Emergency contacts</TabsTrigger>
            <TabsTrigger value="basics">Basic details</TabsTrigger>
          </TabsList>

          <TabsContent value="health" className="flex flex-col gap-6">
            <fieldset className="flex flex-col gap-3">
              <legend className="mb-1 text-base font-semibold">Allergies</legend>
              {allergies.length === 0 && <p className="text-[0.9375rem] text-muted-foreground">No allergies recorded.</p>}
              {allergies.map((a, i) => (
                <div key={i} className="grid gap-2 rounded-lg border border-border p-3 sm:grid-cols-[1fr_9rem_1fr_auto]">
                  <Input aria-label="Allergy" placeholder="e.g. Penicillin" value={a.name} onChange={(e) => setAllergies(allergies.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)))} />
                  <NativeSelect aria-label="How serious" value={a.severity} onChange={(e) => setAllergies(allergies.map((x, j) => (j === i ? { ...x, severity: e.target.value as Allergy["severity"] } : x)))}>
                    <NativeSelectOption value="mild">Mild</NativeSelectOption>
                    <NativeSelectOption value="moderate">Moderate</NativeSelectOption>
                    <NativeSelectOption value="severe">Severe</NativeSelectOption>
                  </NativeSelect>
                  <Input aria-label="Reaction" placeholder="Reaction (e.g. rash)" value={a.reaction ?? ""} onChange={(e) => setAllergies(allergies.map((x, j) => (j === i ? { ...x, reaction: e.target.value } : x)))} />
                  <Button type="button" variant="ghost" size="icon" aria-label={`Remove allergy ${a.name}`} onClick={() => setAllergies(allergies.filter((_, j) => j !== i))}><Trash2 aria-hidden="true" /></Button>
                </div>
              ))}
              <Button type="button" variant="outline" size="sm" className="w-fit" onClick={() => setAllergies([...allergies, { name: "", severity: "moderate" }])}><Plus aria-hidden="true" /> Add allergy</Button>
            </fieldset>
            <fieldset className="flex flex-col gap-3">
              <legend className="mb-1 text-base font-semibold">Health conditions</legend>
              {conditions.map((c, i) => (
                <div key={i} className="grid grid-cols-[1fr_7rem_auto] gap-2">
                  <Input aria-label="Condition" placeholder="e.g. Type 2 diabetes" value={c.name} onChange={(e) => setConditions(conditions.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)))} />
                  <Input aria-label="Since (year)" placeholder="Since" inputMode="numeric" value={c.since ?? ""} onChange={(e) => setConditions(conditions.map((x, j) => (j === i ? { ...x, since: e.target.value } : x)))} />
                  <Button type="button" variant="ghost" size="icon" aria-label={`Remove ${c.name}`} onClick={() => setConditions(conditions.filter((_, j) => j !== i))}><Trash2 aria-hidden="true" /></Button>
                </div>
              ))}
              <Button type="button" variant="outline" size="sm" className="w-fit" onClick={() => setConditions([...conditions, { name: "" }])}><Plus aria-hidden="true" /> Add condition</Button>
            </fieldset>
            <Field label="Notes for doctors and caregivers" htmlFor="notes" optional>
              <Textarea id="notes" value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={500} placeholder="e.g. Prefers Hindi. Uses reading glasses." />
            </Field>
            <div className="flex justify-end"><Button onClick={saveHealth} disabled={pending}>{pending ? "Saving…" : "Save health details"}</Button></div>
          </TabsContent>

          <TabsContent value="contacts" className="flex flex-col gap-3">
            {contacts.map((c, i) => (
              <div key={i} className="grid gap-2 rounded-lg border border-border p-3 sm:grid-cols-[1fr_8rem_1fr_auto]">
                <Input aria-label="Name" placeholder="Name" value={c.name} onChange={(e) => setContacts(contacts.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)))} />
                <Input aria-label="Relation" placeholder="Relation" value={c.relation} onChange={(e) => setContacts(contacts.map((x, j) => (j === i ? { ...x, relation: e.target.value } : x)))} />
                <Input aria-label="Phone" placeholder="+91 …" type="tel" value={c.phone} onChange={(e) => setContacts(contacts.map((x, j) => (j === i ? { ...x, phone: e.target.value } : x)))} />
                <Button type="button" variant="ghost" size="icon" aria-label={`Remove ${c.name}`} onClick={() => setContacts(contacts.filter((_, j) => j !== i))}><Trash2 aria-hidden="true" /></Button>
              </div>
            ))}
            {contacts.length < 5 && (
              <Button type="button" variant="outline" size="sm" className="w-fit" onClick={() => setContacts([...contacts, { name: "", relation: "", phone: "" }])}><Plus aria-hidden="true" /> Add contact</Button>
            )}
            <div className="flex justify-end"><Button onClick={saveHealth} disabled={pending}>{pending ? "Saving…" : "Save contacts"}</Button></div>
          </TabsContent>

          <TabsContent value="basics">
            <form action={saveBasics} className="grid gap-4 sm:grid-cols-2">
              <Field label="Full name" htmlFor="m-name" error={errors.name} className="sm:col-span-2">
                <Input id="m-name" name="name" defaultValue={member.name} required {...describedBy("m-name", errors.name)} />
              </Field>
              <Field label="Date of birth" htmlFor="m-dob" error={errors.dateOfBirth}>
                <Input id="m-dob" name="dateOfBirth" type="date" defaultValue={member.dateOfBirth ?? ""} />
              </Field>
              <Field label="Sex" htmlFor="m-sex">
                <NativeSelect id="m-sex" name="sex" defaultValue={member.sex ?? ""}>
                  <NativeSelectOption value="">Prefer not to say</NativeSelectOption>
                  <NativeSelectOption value="female">Female</NativeSelectOption>
                  <NativeSelectOption value="male">Male</NativeSelectOption>
                  <NativeSelectOption value="other">Other</NativeSelectOption>
                </NativeSelect>
              </Field>
              <Field label="Blood group" htmlFor="m-blood">
                <NativeSelect id="m-blood" name="bloodGroup" defaultValue={member.bloodGroup ?? ""}>
                  <NativeSelectOption value="">Not known</NativeSelectOption>
                  {BLOOD_GROUPS.map((b) => <NativeSelectOption key={b} value={b}>{b}</NativeSelectOption>)}
                </NativeSelect>
              </Field>
              <Field label="Height (cm)" htmlFor="m-height" error={errors.heightCm}>
                <Input id="m-height" name="heightCm" inputMode="numeric" defaultValue={member.heightCm ?? ""} />
              </Field>
              <Field label="Phone" htmlFor="m-phone" optional className="sm:col-span-2">
                <Input id="m-phone" name="phone" type="tel" defaultValue={member.phone ?? ""} />
              </Field>
              <div className="flex justify-end sm:col-span-2"><Button type="submit" disabled={pending}>{pending ? "Saving…" : "Save details"}</Button></div>
            </form>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
