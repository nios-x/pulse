import type { Metadata } from "next";
import Link from "next/link";
import { and, asc, eq, gte, lte } from "drizzle-orm";
import { ArrowRight, CalendarDays, MapPin, NotebookPen, Users, Video } from "lucide-react";
import { db } from "@/db";
import { appointments, members } from "@/db/schema";
import { CopyCode } from "@/components/doctor/copy-code";
import { EmptyState } from "@/components/health/empty-state";
import { MemberAvatar } from "@/components/health/member-avatar";
import { StatusBadge } from "@/components/health/status-badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ageFrom, formatDay, formatTime, greeting, istDate } from "@/lib/dates";
import { doctorPatients, getDoctorContext } from "@/lib/doctor";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Today · Doctor" };

export default async function DoctorHome() {
  const { doctor } = await getDoctorContext();
  const now = new Date();
  const [appts, patients] = await Promise.all([
    db
      .select({ a: appointments, m: members })
      .from(appointments)
      .innerJoin(members, eq(appointments.memberId, members.id))
      .where(and(eq(appointments.doctorId, doctor.id), gte(appointments.startsAt, new Date(now.getTime() - 12 * 3_600_000)), lte(appointments.startsAt, new Date(now.getTime() + 14 * 86_400_000))))
      .orderBy(asc(appointments.startsAt)),
    doctorPatients(doctor.id),
  ]);
  const today = istDate();
  const todays = appts.filter((x) => istDate(x.a.startsAt) === today);
  const patientIds = new Set(patients.map((p) => p.member.id));

  return (
    <div className="flex flex-col gap-8 animate-rise">
      <section className="rounded-3xl bg-brand p-6 text-brand-foreground sm:p-8">
        <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr] lg:items-center">
          <div className="space-y-3">
            <p className="text-sm font-semibold opacity-85">{formatDay(now)}</p>
            <h1 className="font-heading text-[2rem] leading-tight font-bold text-inherit">{greeting()}, {doctor.name}</h1>
            <p className="text-base opacity-90">{todays.length ? `${todays.length} appointment${todays.length > 1 ? "s" : ""} today` : "No appointments today"} · {patients.length} patient{patients.length === 1 ? "" : "s"} sharing with you</p>
          </div>
          <div className="rounded-2xl border border-brand-foreground/20 p-5">
            <p className="text-sm opacity-85">Your connect code</p>
            <p data-testid="connect-code" className="font-mono text-4xl font-bold tracking-[0.3em]">{doctor.connectCode}</p>
            <p className="mt-1 text-sm opacity-85">Families enter this to share a patient&apos;s records with you.</p>
            <div className="mt-3"><CopyCode code={doctor.connectCode ?? ""} /></div>
          </div>
        </div>
      </section>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 font-heading text-xl font-bold"><CalendarDays className="size-5 text-accent-foreground" aria-hidden="true" /> Appointments</CardTitle>
          <CardDescription>Today and the next two weeks, booked through Pulse</CardDescription>
        </CardHeader>
        <CardContent>
          {appts.length === 0 ? (
            <EmptyState compact icon={CalendarDays} title="No bookings yet" description="Families can book your open slots from the Pulse doctor directory." />
          ) : (
            <ul className="flex flex-col gap-3">
              {appts.map(({ a, m }) => {
                const isToday = istDate(a.startsAt) === today;
                const canSee = patientIds.has(m.id);
                return (
                  <li key={a.id} className="flex flex-col gap-3 rounded-2xl border border-border p-4 sm:flex-row sm:items-center">
                    <div className={cn("flex w-16 shrink-0 flex-col items-center rounded-xl py-2", isToday ? "bg-brand text-brand-foreground" : "bg-surface")}>
                      <span className="text-xs font-semibold uppercase">{formatDay(a.startsAt).split(",")[0]}</span>
                      <span className="font-heading text-lg font-extrabold tabular">{formatTime(a.startsAt).replace(/\s?(am|pm)/, "")}</span>
                      <span className="text-xs">{formatTime(a.startsAt).slice(-2)}</span>
                    </div>
                    <div className="flex min-w-0 flex-1 items-center gap-3">
                      <MemberAvatar name={m.name} tone={m.avatarTone} />
                      <div className="min-w-0">
                        <p className="text-base font-semibold">{m.name} <span className="font-normal text-muted-foreground">· {ageFrom(m.dateOfBirth)} yrs</span></p>
                        <p className="truncate text-sm text-muted-foreground">{a.reason ?? "Consultation"}</p>
                        <p className="flex items-center gap-1.5 text-sm text-muted-foreground">{a.mode === "video" ? <Video className="size-4" aria-hidden="true" /> : <MapPin className="size-4" aria-hidden="true" />} {a.mode === "video" ? "Video consult" : "At the clinic"}</p>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      {a.status === "completed" && <StatusBadge tone="success" label="Seen" size="sm" />}
                      {a.mode === "video" && a.meetingUrl && a.status === "scheduled" && <a href={a.meetingUrl} target="_blank" rel="noreferrer" className={buttonVariants({ variant: "outline", size: "sm" })}><Video aria-hidden="true" /> Join</a>}
                      {canSee && <Link href={`/doctor/patients/${m.id}?appointment=${a.id}`} className={buttonVariants({ size: "sm" })}><NotebookPen aria-hidden="true" /> Open chart</Link>}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Link href="/doctor/patients" className={buttonVariants({ variant: "ghost" })}><Users aria-hidden="true" /> All patients <ArrowRight aria-hidden="true" /></Link>
      </div>
    </div>
  );
}
