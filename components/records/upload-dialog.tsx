"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { FileUp, Lock } from "lucide-react";
import { toast } from "sonner";
import { uploadRecord } from "@/app/actions/records";
import { describedBy, Field } from "@/components/form/field";
import { Dropzone } from "@/components/records/dropzone";
import { useAccess } from "@/components/providers/access-provider";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import { ACCEPTED_UPLOADS, MAX_UPLOAD_BYTES } from "@/lib/files";
import { RECORD_TYPE_LABEL } from "@/lib/labels";

export function UploadDialog({ members, defaultOpen, defaultMemberId, today }: { members: { id: string; name: string }[]; defaultOpen?: boolean; defaultMemberId?: string; today: string }) {
  const router = useRouter();
  const { can } = useAccess();
  const allowed = members.filter((m) => can("records.upload", m.id));
  const [open, setOpen] = useState(Boolean(defaultOpen) && allowed.length > 0);
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [errors, setErrors] = useState<Record<string, string | undefined>>({});
  const [pending, start] = useTransition();

  const pick = (f: File | null) => {
    setErrors((e) => ({ ...e, file: "" }));
    if (f && f.size > MAX_UPLOAD_BYTES) { setErrors((e) => ({ ...e, file: "That file is larger than 8 MB." })); return; }
    if (f && !ACCEPTED_UPLOADS.split(",").includes(f.type)) { setErrors((e) => ({ ...e, file: "Please choose a PDF, JPG, PNG or WebP file." })); return; }
    setFile(f);
    if (f && !title) setTitle(f.name.replace(/\.[^.]+$/, "").replace(/[-_]+/g, " ").slice(0, 80));
  };

  const submit = (form: FormData) =>
    start(async () => {
      if (file) form.set("file", file);
      const res = await uploadRecord(form);
      if (res.ok) {
        toast.success(res.message);
        setOpen(false);
        setFile(null);
        setTitle("");
        setErrors({});
        router.replace("/records", { scroll: false });
      } else {
        setErrors(res.fieldErrors ?? {});
        toast.error(res.error);
      }
    });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger disabled={!allowed.length} render={<Button><FileUp aria-hidden="true" /> Upload a record</Button>} />
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Upload a health record</DialogTitle>
          <DialogDescription className="flex items-center gap-1.5"><Lock className="size-4" aria-hidden="true" /> Files are encrypted before they&apos;re stored.</DialogDescription>
        </DialogHeader>
        <form action={submit} className="flex flex-col gap-4">
          <Dropzone file={file} onFile={pick} accept={ACCEPTED_UPLOADS} error={errors.file} />
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Whose record?" htmlFor="r-member" error={errors.memberId}>
              <NativeSelect id="r-member" name="memberId" defaultValue={allowed.find((m) => m.id === defaultMemberId)?.id ?? allowed[0]?.id}>
                {allowed.map((m) => <NativeSelectOption key={m.id} value={m.id}>{m.name}</NativeSelectOption>)}
              </NativeSelect>
            </Field>
            <Field label="Type" htmlFor="r-type">
              <NativeSelect id="r-type" name="type" defaultValue="lab_report">
                {Object.entries(RECORD_TYPE_LABEL).map(([k, v]) => <NativeSelectOption key={k} value={k}>{v}</NativeSelectOption>)}
              </NativeSelect>
            </Field>
            <Field label="Name" htmlFor="r-title" error={errors.title} className="sm:col-span-2">
              <Input id="r-title" name="title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Thyroid test" required {...describedBy("r-title", errors.title)} />
            </Field>
            <Field label="Date on the report" htmlFor="r-date" error={errors.recordDate}>
              <Input id="r-date" name="recordDate" type="date" max={today} defaultValue={today} required />
            </Field>
            <Field label="Lab, hospital or doctor" htmlFor="r-provider" optional>
              <Input id="r-provider" name="provider" placeholder="e.g. Metropolis, Kothrud" />
            </Field>
            <Field label="Notes" htmlFor="r-notes" optional className="sm:col-span-2">
              <Textarea id="r-notes" name="notes" placeholder="Anything the doctor said about it" />
            </Field>
          </div>
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={pending}>{pending ? "Encrypting and saving…" : "Save record"}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
