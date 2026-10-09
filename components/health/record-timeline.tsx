"use client";

import { useMemo, useState, useTransition } from "react";
import { Download, Eye, FileHeart, FileText, Lock, ScanLine, Syringe, Trash2, X, type LucideIcon } from "lucide-react";
import { toast } from "sonner";
import { deleteRecord } from "@/app/actions/records";
import { EmptyState } from "@/components/health/empty-state";
import { MemberAvatar } from "@/components/health/member-avatar";
import { useAccess } from "@/components/providers/access-provider";
import { Button, buttonVariants } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import type { RecordType } from "@/db/schema";
import { fileSize, RECORD_TYPE_LABEL } from "@/lib/labels";
import { cn } from "@/lib/utils";

export type TimelineRecord = {
  id: string;
  memberId: string;
  type: RecordType;
  title: string;
  recordDate: string;
  provider: string | null;
  notes: string | null;
  fileName: string | null;
  mimeType: string | null;
  sizeBytes: number | null;
  highlights: string[];
};

const TYPE_ICON: Record<RecordType, LucideIcon> = {
  lab_report: FileHeart,
  prescription: FileText,
  scan: ScanLine,
  discharge: FileText,
  vaccination: Syringe,
  other: FileText,
};

const monthFmt = new Intl.DateTimeFormat("en-IN", { month: "long", year: "numeric", timeZone: "UTC" });
const dayFmt = new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });

export function RecordTimeline({
  records,
  members,
  showFilters = true,
  emptyAction,
}: {
  records: TimelineRecord[];
  members: { id: string; name: string; tone: number }[];
  showFilters?: boolean;
  emptyAction?: React.ReactNode;
}) {
  const { can } = useAccess();
  const [member, setMember] = useState("all");
  const [type, setType] = useState("all");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [preview, setPreview] = useState<TimelineRecord | null>(null);
  const [pending, start] = useTransition();
  const memberMap = useMemo(() => new Map(members.map((m) => [m.id, m])), [members]);

  const filtered = records.filter(
    (r) => (member === "all" || r.memberId === member) && (type === "all" || r.type === type) && (!from || r.recordDate >= from) && (!to || r.recordDate <= to)
  );
  const groups = new Map<string, TimelineRecord[]>();
  for (const r of filtered) {
    const key = r.recordDate.slice(0, 7);
    groups.set(key, [...(groups.get(key) ?? []), r]);
  }
  const filtering = member !== "all" || type !== "all" || from || to;

  const remove = (r: TimelineRecord) =>
    start(async () => {
      const res = await deleteRecord(r.id);
      if (res.ok) toast.success(res.message);
      else toast.error(res.error);
    });

  return (
    <div className="flex flex-col gap-6">
      {showFilters && records.length > 0 && (
        <div className="grid gap-3 rounded-xl border border-border bg-card p-4 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_auto_auto_auto] lg:items-end">
          <label className="flex flex-col gap-1.5 text-sm font-medium">
            Person
            <NativeSelect value={member} onChange={(e) => setMember(e.target.value)} size="sm">
              <NativeSelectOption value="all">Everyone</NativeSelectOption>
              {members.map((m) => (
                <NativeSelectOption key={m.id} value={m.id}>
                  {m.name}
                </NativeSelectOption>
              ))}
            </NativeSelect>
          </label>
          <label className="flex flex-col gap-1.5 text-sm font-medium">
            Type
            <NativeSelect value={type} onChange={(e) => setType(e.target.value)} size="sm">
              <NativeSelectOption value="all">All types</NativeSelectOption>
              {Object.entries(RECORD_TYPE_LABEL).map(([k, v]) => (
                <NativeSelectOption key={k} value={k}>
                  {v}
                </NativeSelectOption>
              ))}
            </NativeSelect>
          </label>
          <label className="flex flex-col gap-1.5 text-sm font-medium">
            From
            <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="h-10" />
          </label>
          <label className="flex flex-col gap-1.5 text-sm font-medium">
            To
            <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="h-10" />
          </label>
          <Button variant="ghost" size="sm" disabled={!filtering} onClick={() => { setMember("all"); setType("all"); setFrom(""); setTo(""); }}>
            <X aria-hidden="true" /> Clear
          </Button>
        </div>
      )}

      <p className="sr-only" aria-live="polite">
        {filtered.length} record{filtered.length === 1 ? "" : "s"} shown
      </p>

      {filtered.length === 0 ? (
        <EmptyState
          icon={FileHeart}
          title={filtering ? "No records match these filters" : "No records yet"}
          description={filtering ? "Try another person, type or date." : "Upload lab reports, prescriptions and scans so they're ready for every doctor visit."}
          action={filtering ? <Button variant="outline" onClick={() => { setMember("all"); setType("all"); setFrom(""); setTo(""); }}>Clear filters</Button> : emptyAction}
        />
      ) : (
        <ol className="flex flex-col gap-8">
          {[...groups.entries()].map(([month, list]) => (
            <li key={month}>
              <h3 className="mb-4 text-sm font-semibold tracking-wide text-muted-foreground uppercase">{monthFmt.format(new Date(`${month}-01T00:00:00Z`))}</h3>
              <ol className="relative flex flex-col gap-4 border-l-2 border-border pl-6 sm:pl-8">
                {list.map((r) => {
                  const Icon = TYPE_ICON[r.type];
                  const m = memberMap.get(r.memberId);
                  const isImage = r.mimeType?.startsWith("image/");
                  return (
                    <li key={r.id} className="relative">
                      <span className="absolute top-5 -left-[2.0625rem] flex size-4 items-center justify-center rounded-full border-2 border-background bg-primary sm:-left-[2.5625rem]" aria-hidden="true" />
                      <article className="flex flex-col gap-4 rounded-xl border border-border bg-card p-4 sm:flex-row sm:p-5">
                        <button
                          type="button"
                          disabled={!r.mimeType}
                          onClick={() => setPreview(r)}
                          aria-label={r.mimeType ? `Preview ${r.title}` : undefined}
                          className="group relative flex h-36 w-full shrink-0 cursor-pointer items-center justify-center overflow-hidden rounded-lg border border-border bg-surface sm:h-32 sm:w-28 disabled:cursor-default"
                        >
                          {isImage ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={`/api/records/${r.id}/file`} alt="" loading="lazy" className="h-full w-full object-cover object-top transition-transform duration-200 group-hover:scale-[1.03]" />
                          ) : (
                            <span className="flex flex-col items-center gap-1.5 text-muted-foreground">
                              <Icon className="size-8" aria-hidden="true" />
                              <span className="text-xs font-medium">{r.mimeType === "application/pdf" ? "PDF" : "No file"}</span>
                            </span>
                          )}
                        </button>
                        <div className="min-w-0 flex-1 space-y-2">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="inline-flex h-6 items-center gap-1.5 rounded-full bg-accent px-2 text-xs font-medium text-accent-foreground">
                              <Icon className="size-3.5" aria-hidden="true" />
                              {RECORD_TYPE_LABEL[r.type]}
                            </span>
                            <span className="text-sm text-muted-foreground">{dayFmt.format(new Date(`${r.recordDate}T00:00:00Z`))}</span>
                          </div>
                          <h4 className="text-lg leading-snug font-semibold">{r.title}</h4>
                          <p className="flex flex-wrap items-center gap-x-2 text-[0.9375rem] text-muted-foreground">
                            {m && (
                              <span className="inline-flex items-center gap-1.5 font-medium text-foreground">
                                <MemberAvatar name={m.name} tone={m.tone} size="sm" className="size-6 text-[0.625rem]" />
                                {m.name.split(" ")[0]}
                              </span>
                            )}
                            {r.provider && <span>· {r.provider}</span>}
                          </p>
                          {r.notes && <p className="text-[0.9375rem]">{r.notes}</p>}
                          {r.highlights.length > 0 && (
                            <div className="flex flex-wrap gap-1.5">
                              {r.highlights.map((h) => (
                                <span key={h} className="inline-flex h-7 items-center rounded-full border border-border px-2.5 text-sm tabular">{h}</span>
                              ))}
                            </div>
                          )}
                          <div className="flex flex-wrap items-center gap-2 pt-1">
                            {r.mimeType && (
                              <>
                                <Button variant="outline" size="sm" onClick={() => setPreview(r)}>
                                  <Eye aria-hidden="true" /> Preview
                                </Button>
                                <a href={`/api/records/${r.id}/file?download`} className={buttonVariants({ variant: "ghost", size: "sm" })}>
                                  <Download aria-hidden="true" /> Download
                                </a>
                                <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                                  <Lock className="size-3.5" aria-hidden="true" /> Encrypted{r.sizeBytes ? ` · ${fileSize(r.sizeBytes)}` : ""}
                                </span>
                              </>
                            )}
                            {can("records.upload", r.memberId) && (
                              <Button variant="ghost" size="sm" className="ml-auto text-danger hover:bg-danger-soft" disabled={pending} onClick={() => { if (confirm(`Delete "${r.title}"? This can't be undone.`)) remove(r); }}>
                                <Trash2 aria-hidden="true" /> Delete
                              </Button>
                            )}
                          </div>
                        </div>
                      </article>
                    </li>
                  );
                })}
              </ol>
            </li>
          ))}
        </ol>
      )}

      <Dialog open={preview != null} onOpenChange={(o) => !o && setPreview(null)}>
        <DialogContent className={cn("sm:max-w-3xl", "p-4 sm:p-6")}>
          {preview && (
            <>
              <DialogHeader className="pr-10">
                <DialogTitle>{preview.title}</DialogTitle>
                <DialogDescription>
                  {RECORD_TYPE_LABEL[preview.type]} · {dayFmt.format(new Date(`${preview.recordDate}T00:00:00Z`))}
                  {preview.provider ? ` · ${preview.provider}` : ""}
                </DialogDescription>
              </DialogHeader>
              <div className="overflow-hidden rounded-lg border border-border bg-surface">
                {preview.mimeType === "application/pdf" ? (
                  <iframe src={`/api/records/${preview.id}/file`} title={preview.title} className="h-[70dvh] w-full" />
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={`/api/records/${preview.id}/file`} alt={`${preview.title}, ${RECORD_TYPE_LABEL[preview.type]}`} className="mx-auto max-h-[70dvh] w-auto" />
                )}
              </div>
              <div className="flex justify-end">
                <a href={`/api/records/${preview.id}/file?download`} className={buttonVariants({ variant: "outline" })}>
                  <Download aria-hidden="true" /> Download
                </a>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
