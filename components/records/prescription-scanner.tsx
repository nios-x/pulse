"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CircleAlert, FileScan, Plus, ScanLine, Sparkles, Trash2, TriangleAlert } from "lucide-react";
import { toast } from "sonner";
import { confirmScan, scanPrescription, type ScanResult } from "@/app/actions/scan";
import { Field } from "@/components/form/field";
import { SafetyNote } from "@/components/health/safety-note";
import { StatusBadge } from "@/components/health/status-badge";
import { Dropzone } from "@/components/records/dropzone";
import { useAccess } from "@/components/providers/access-provider";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { Skeleton } from "@/components/ui/skeleton";
import { formatTime } from "@/lib/dates";
import type { ReviewedMedicine } from "@/lib/prescription";
import { cn } from "@/lib/utils";

type Row = ReviewedMedicine & { include: boolean };

export function PrescriptionScanner({ members, aiEnabled }: { members: { id: string; name: string }[]; aiEnabled: boolean }) {
  const router = useRouter();
  const { can } = useAccess();
  const allowed = members.filter((m) => can("records.upload", m.id));
  const [memberId, setMemberId] = useState(allowed[0]?.id ?? "");
  const [file, setFile] = useState<File | null>(null);
  const [result, setResult] = useState<ScanResult | null>(null);
  const [rows, setRows] = useState<Row[]>([]);
  const [saveRecord, setSaveRecord] = useState(true);
  const [scanning, startScan] = useTransition();
  const [saving, startSave] = useTransition();
  const canMeds = can("meds.manage", memberId);

  const scan = () =>
    startScan(async () => {
      if (!file) return;
      const f = new FormData();
      f.set("memberId", memberId);
      f.set("file", file);
      const res = await scanPrescription(f);
      if (res.ok && res.data) {
        setResult(res.data);
        setRows(res.data.medicines.map((m) => ({ ...m, include: m.times.length > 0 })));
      } else if (!res.ok) toast.error(res.error);
    });

  const update = (i: number, patch: Partial<Row>) => setRows((r) => r.map((x, j) => (j === i ? { ...x, ...patch } : x)));

  const confirm = () =>
    startSave(async () => {
      const f = new FormData();
      if (file) f.set("file", file);
      const items = rows.filter((r) => r.include);
      f.set("payload", JSON.stringify({ memberId, doctor: result?.doctor ?? null, saveRecord, items: canMeds ? items.map((m) => ({ name: m.name, strength: m.strength, genericName: m.genericName, times: m.times, instructions: m.instructions, durationDays: m.durationDays })) : [] }));
      const res = await confirmScan(f);
      if (res.ok) {
        toast.success(res.message);
        router.push(`/medications?member=${memberId}`);
      } else toast.error(res.error);
    });

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)]">
      <section className="flex flex-col gap-5 rounded-xl border border-border bg-card p-5 sm:p-6 lg:self-start">
        <h2 className="text-lg font-semibold">1. Take or upload a photo</h2>
        {!aiEnabled && (
          <p className="flex gap-2 rounded-lg border border-warning-border bg-warning-soft px-3.5 py-3 text-sm text-warning">
            <CircleAlert className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
            <span>Demo mode: no AI key is set, so you&apos;ll see a <strong>sample result</strong> instead of a real reading. Set GEMINI_API_KEY to read real prescriptions.</span>
          </p>
        )}
        <Field label="Whose prescription?" htmlFor="scan-member">
          <NativeSelect id="scan-member" value={memberId} onChange={(e) => { setMemberId(e.target.value); setResult(null); }}>
            {allowed.map((m) => <NativeSelectOption key={m.id} value={m.id}>{m.name}</NativeSelectOption>)}
          </NativeSelect>
        </Field>
        <Dropzone file={file} onFile={(f) => { setFile(f); setResult(null); }} accept="image/jpeg,image/png,image/webp,application/pdf" title="Photo of the prescription" hint="Flat, well lit, all medicines visible · JPG, PNG or PDF" capture />
        <Button size="lg" onClick={scan} disabled={!file || !memberId || scanning}>
          <ScanLine aria-hidden="true" /> {scanning ? "Reading the prescription…" : "Read prescription"}
        </Button>
        <p className="text-sm text-muted-foreground">The photo is only stored if you choose to save it, and then it is encrypted.</p>
      </section>

      <section aria-live="polite" aria-busy={scanning} className="flex flex-col gap-5 rounded-xl border border-border bg-card p-5 sm:p-6">
        <h2 className="text-lg font-semibold">2. Check and add</h2>
        {scanning ? (
          <div className="flex flex-col gap-3">
            <p className="flex items-center gap-2 text-base text-muted-foreground"><Sparkles className="size-5 animate-pulse text-primary" aria-hidden="true" /> Reading handwriting and matching medicines…</p>
            {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-lg" />)}
          </div>
        ) : !result ? (
          <div className="flex flex-col items-center gap-3 py-12 text-center">
            <span className="flex size-14 items-center justify-center rounded-full bg-accent text-accent-foreground"><FileScan className="size-7" aria-hidden="true" /></span>
            <p className="text-lg font-semibold">Medicines will appear here</p>
            <p className="max-w-sm text-base text-muted-foreground">You&apos;ll check every medicine, fix anything that was misread, and choose what to add.</p>
          </div>
        ) : (
          <>
            <div className="flex flex-wrap items-center gap-2">
              {result.source === "ai" ? <StatusBadge tone="info" icon={Sparkles} label="Read by AI · please check" /> : <StatusBadge tone="warning" label="Sample result (demo mode)" />}
              {result.doctor && <span className="text-[0.9375rem] text-muted-foreground">From {result.doctor}</span>}
            </div>
            {result.warnings.length > 0 && (
              <div className="rounded-lg border border-danger-border bg-danger-soft/60 p-3.5">
                <p className="flex items-center gap-2 text-base font-semibold text-danger"><TriangleAlert className="size-5" aria-hidden="true" /> Check with the doctor</p>
                <ul className="mt-1.5 list-disc space-y-1 pl-6 text-[0.9375rem]">{result.warnings.map((w) => <li key={w}>{w}</li>)}</ul>
              </div>
            )}
            <ul className="flex flex-col gap-3">
              {rows.map((r, i) => (
                <li key={i} className={cn("rounded-lg border p-4 transition-colors", r.include ? "border-primary/40 bg-accent/30" : "border-border")}>
                  <div className="flex items-start gap-3">
                    <Checkbox checked={r.include} onCheckedChange={(v) => update(i, { include: Boolean(v) })} aria-label={`Add ${r.name}`} className="mt-3" />
                    <div className="grid flex-1 gap-3 sm:grid-cols-[1fr_8rem]">
                      <label className="flex flex-col gap-1 text-sm font-medium">
                        Medicine
                        <Input value={r.name} onChange={(e) => update(i, { name: e.target.value })} className="h-11" />
                      </label>
                      <label className="flex flex-col gap-1 text-sm font-medium">
                        Strength
                        <Input value={r.strength} onChange={(e) => update(i, { strength: e.target.value })} className="h-11" />
                      </label>
                      <div className="flex flex-wrap items-center gap-2 sm:col-span-2">
                        {r.genericName && <span className="text-sm text-muted-foreground">{r.genericName}</span>}
                        {r.confidence === "low" && <StatusBadge tone="warning" label="Hard to read: please check" size="sm" />}
                        {!r.known && <StatusBadge tone="neutral" label="Not in our medicine list" size="sm" />}
                      </div>
                      <div className="flex flex-wrap items-center gap-2 sm:col-span-2">
                        {r.times.map((t, ti) => (
                          <span key={ti} className="inline-flex items-center gap-1">
                            <Input type="time" value={t} aria-label={`${r.name} time ${ti + 1}`} onChange={(e) => update(i, { times: r.times.map((x, k) => (k === ti ? e.target.value : x)) })} className="h-10 w-32" />
                            <button type="button" aria-label={`Remove ${formatTime(t)}`} onClick={() => update(i, { times: r.times.filter((_, k) => k !== ti) })} className="flex size-10 cursor-pointer items-center justify-center rounded-md text-muted-foreground hover:bg-muted"><Trash2 className="size-4" aria-hidden="true" /></button>
                          </span>
                        ))}
                        <Button type="button" variant="ghost" size="sm" onClick={() => update(i, { times: [...r.times, "08:00"], include: true })}><Plus aria-hidden="true" /> Time</Button>
                        {r.times.length === 0 && <span className="text-sm text-muted-foreground">Only when needed: add a time to get reminders</span>}
                      </div>
                      <p className="text-sm text-muted-foreground sm:col-span-2">
                        {[r.instructions, r.durationDays ? `for ${r.durationDays} days` : null].filter(Boolean).join(" · ") || "No instructions read"}
                      </p>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
            {result.notes && <p className="rounded-lg bg-surface px-3.5 py-3 text-[0.9375rem]"><span className="font-medium">Doctor&apos;s notes: </span>{result.notes}</p>}
            <label className="flex cursor-pointer items-center gap-3 text-[0.9375rem]">
              <Checkbox checked={saveRecord} onCheckedChange={(v) => setSaveRecord(Boolean(v))} /> Save the photo to records (encrypted)
            </label>
            {!canMeds && <p className="text-sm text-warning">Your role can save the prescription but not add medicines.</p>}
            <SafetyNote>AI can misread handwriting. Check each medicine against the paper. Not a diagnosis. Consult a doctor.</SafetyNote>
            <Button size="lg" onClick={confirm} disabled={saving || (!saveRecord && (!canMeds || !rows.some((r) => r.include))) || rows.some((r) => r.include && r.times.length === 0)}>
              {saving ? "Saving…" : canMeds ? `Add ${rows.filter((r) => r.include).length} medicine${rows.filter((r) => r.include).length === 1 ? "" : "s"}` : "Save prescription"}
            </Button>
          </>
        )}
      </section>
    </div>
  );
}
