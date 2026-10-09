import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { desc, eq } from "drizzle-orm";
import { ArrowLeft, Droplet, FileText, Lock, NotebookPen, Pill, TriangleAlert } from "lucide-react";
import { db } from "@/db";
import { doctorNotes, doctors, members, pcosProfiles } from "@/db/schema";
import { NoteForm } from "@/components/doctor/note-form";
import { MemberAvatar } from "@/components/health/member-avatar";
import { SafetyNote } from "@/components/health/safety-note";
import { VitalChart } from "@/components/health/vital-chart";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { VitalKind } from "@/db/schema";
import { getMemberOverview } from "@/lib/data";
import { ageFrom, formatDate, formatDateTime, formatTime } from "@/lib/dates";
import { getDoctorContext, hasDoctorAccess } from "@/lib/doctor";
import { checkInteractions } from "@/lib/drugs";
import { RECORD_TYPE_LABEL } from "@/lib/labels";
import { PHENOTYPE_INFO } from "@/lib/pcos";
import { toPoints } from "@/lib/serialize";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Patient chart · Doctor" };

export default async function PatientChart({ params, searchParams }: { params: Promise<{ memberId: string }>; searchParams: Promise<{ appointment?: string }> }) {
  const [{ memberId }, { appointment }] = await Promise.all([params, searchParams]);
  if (!/^[0-9a-f-]{36}$/i.test(memberId)) notFound();
  const { doctor } = await getDoctorContext();
  if (!(await hasDoctorAccess(doctor.id, memberId))) {
    return (
      <div className="mx-auto flex max-w-md flex-col items-center gap-3 py-20 text-center">
        <Lock className="size-10 text-muted-foreground" aria-hidden="true" />
        <h1 className="text-2xl font-semibold">Access has ended</h1>
        <p className="text-muted-foreground">The family hasn&apos;t shared this profile with you, or the sharing period is over.</p>
        <Link href="/doctor/patients" className={buttonVariants()}>Back to patients</Link>
      </div>
    );
  }
  const [member] = await db.select().from(members).where(eq(members.id, memberId)).limit(1);
  if (!member) notFound();
  const [data, notes, pcos] = await Promise.all([
    getMemberOverview(member),
    db.select({ n: doctorNotes, doctor: doctors.name }).from(doctorNotes).innerJoin(doctors, eq(doctorNotes.doctorId, doctors.id)).where(eq(doctorNotes.memberId, memberId)).orderBy(desc(doctorNotes.createdAt)),
    db.select().from(pcosProfiles).where(eq(pcosProfiles.memberId, memberId)),
  ]);
  const { interactions } = checkInteractions(data.activeMeds.map((m) => ({ id: m.id, name: m.name, genericName: m.genericName })));
  const now = data.now.instant.getTime();

  return (
    <div className="flex flex-col gap-6 animate-rise">
      <Link href="/doctor/patients" className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "-ml-2 w-fit")}><ArrowLeft aria-hidden="true" /> Patients</Link>
      <header className="flex flex-wrap items-center gap-4">
        <MemberAvatar name={member.name} tone={member.avatarTone} size="xl" />
        <div className="space-y-1">
          <h1 className="font-heading text-[2rem] leading-tight font-extrabold">{member.name}</h1>
          <p className="text-base text-muted-foreground">{ageFrom(member.dateOfBirth)} years · {member.sex ?? "—"}{member.heightCm ? ` · ${member.heightCm} cm` : ""}</p>
          <div className="flex flex-wrap gap-2">
            {member.bloodGroup && <span className="inline-flex h-7 items-center gap-1.5 rounded-full border border-border px-2.5 text-sm font-semibold"><Droplet className="size-4" aria-hidden="true" /> {member.bloodGroup}</span>}
            {member.allergies.map((a) => <span key={a.name} className="inline-flex h-7 items-center gap-1.5 rounded-full border border-warning-border bg-warning-soft px-2.5 text-sm font-medium text-warning"><TriangleAlert className="size-4" aria-hidden="true" /> {a.name} ({a.severity})</span>)}
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
        <div className="flex flex-col gap-6">
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2 font-heading text-lg font-bold"><Pill className="size-5 text-muted-foreground" aria-hidden="true" /> Medicines</CardTitle><CardDescription>Adherence: {data.adherence7.percent ?? "—"}% last 7 days · {data.adherence30.percent ?? "—"}% last 30 days</CardDescription></CardHeader>
            <CardContent>
              <ul className="divide-y divide-border">
                {data.activeMeds.map((m) => (
                  <li key={m.id} className="flex justify-between gap-3 py-2.5 text-[0.9375rem]">
                    <span><span className="font-semibold">{m.name}</span> {m.strength} <span className="text-muted-foreground">({m.genericName})</span><span className="block text-sm text-muted-foreground">{m.instructions} · {m.prescribedBy}</span></span>
                    <span className="shrink-0 text-sm text-muted-foreground tabular">{m.times.map((t) => formatTime(t)).join(", ")}</span>
                  </li>
                ))}
              </ul>
              {interactions.length > 0 && (
                <div className="mt-3 rounded-xl border border-danger-border bg-danger-soft/60 p-3 text-sm">
                  <p className="font-semibold text-danger">Possible interactions</p>
                  <ul className="mt-1 list-disc pl-5">{interactions.map((i) => <li key={`${i.a}-${i.b}`}>{i.first.name} + {i.second.name} ({i.severity}): {i.effect}</li>)}</ul>
                </div>
              )}
            </CardContent>
          </Card>
          {(["bp", "sugar", "weight"] as VitalKind[]).map((k) => {
            const pts = toPoints(data.vitals.filter((v) => v.kind === k));
            return pts.length ? <VitalChart key={k} kind={k} points={pts} now={now} /> : null;
          })}
          <SafetyNote>Home readings recorded by the family.</SafetyNote>
        </div>

        <div className="flex flex-col gap-6">
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2 font-heading text-lg font-bold"><NotebookPen className="size-5 text-accent-foreground" aria-hidden="true" /> {appointment ? "Note for this visit" : "Add a note"}</CardTitle><CardDescription>The family sees it on {member.name.split(" ")[0]}&apos;s profile and gets an email.</CardDescription></CardHeader>
            <CardContent><NoteForm memberId={member.id} appointmentId={appointment} /></CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle className="font-heading text-lg font-bold">Conditions</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {member.conditions.map((c) => <p key={c.name} className="text-[0.9375rem]">{c.name}{c.since && <span className="text-muted-foreground"> · since {c.since}</span>}</p>)}
              {pcos[0] && <p className="rounded-xl bg-accent px-3 py-2 text-sm">PCOS: {PHENOTYPE_INFO[pcos[0].phenotype].title} pattern (self-reported quiz)</p>}
              {member.notes && <p className="text-sm text-muted-foreground">{member.notes}</p>}
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle className="font-heading text-lg font-bold">Records</CardTitle></CardHeader>
            <CardContent>
              <ul className="divide-y divide-border">
                {data.records.map((r) => (
                  <li key={r.id} className="flex items-center justify-between gap-3 py-2.5">
                    <span className="min-w-0"><span className="block truncate text-[0.9375rem] font-medium">{r.title}</span><span className="text-sm text-muted-foreground">{RECORD_TYPE_LABEL[r.type]} · {formatDate(r.recordDate)}</span></span>
                    {r.mimeType && <a href={`/api/records/${r.id}/file`} target="_blank" rel="noreferrer" className={buttonVariants({ variant: "outline", size: "sm" })}><FileText aria-hidden="true" /> Open</a>}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle className="font-heading text-lg font-bold">Previous notes</CardTitle></CardHeader>
            <CardContent>
              {notes.length === 0 ? <p className="text-base text-muted-foreground">No notes yet.</p> : (
                <ul className="flex flex-col gap-3">
                  {notes.map(({ n, doctor: by }) => (
                    <li key={n.id} className="rounded-xl bg-surface p-3.5 text-[0.9375rem]">
                      <p className="text-sm text-muted-foreground">{by} · {formatDateTime(n.createdAt)}</p>
                      <p className="mt-1">{n.summary}</p>
                      {n.advice && <p className="mt-1 text-muted-foreground"><span className="font-medium text-foreground">Advice: </span>{n.advice}</p>}
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
