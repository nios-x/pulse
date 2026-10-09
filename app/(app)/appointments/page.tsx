import type { Metadata } from "next";
import Link from "next/link";
import { CalendarDays, CalendarPlus, List } from "lucide-react";
import { AddAppointmentDialog } from "@/components/appointments/add-appointment-dialog";
import { MonthCalendar } from "@/components/appointments/month-calendar";
import { AppointmentItem } from "@/components/health/appointment-item";
import { EmptyState } from "@/components/health/empty-state";
import { PageHeader } from "@/components/health/page-header";
import { RoleGate } from "@/components/health/role-gate";
import { MemberFilter } from "@/components/shell/member-filter";
import { buttonVariants } from "@/components/ui/button";
import { getContext } from "@/lib/context";
import { getAppointments } from "@/lib/data";
import { formatDay, istDate, nowMs } from "@/lib/dates";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Appointments" };

export default async function AppointmentsPage({ searchParams }: { searchParams: Promise<{ member?: string; view?: string; month?: string; day?: string }> }) {
  const sp = await searchParams;
  const ctx = await getContext();
  const active = ctx.visibleMembers.find((m) => m.id === sp.member) ?? null;
  const scope = active ? [active] : ctx.visibleMembers;
  const all = await getAppointments(scope.map((m) => m.id));
  const members = new Map(ctx.visibleMembers.map((m) => [m.id, { name: m.name, tone: m.avatarTone }]));
  const view = sp.view === "calendar" ? "calendar" : "list";
  const now = nowMs();
  const upcoming = all.filter((a) => a.status === "scheduled" && a.startsAt.getTime() >= now - a.durationMin * 60_000);
  const past = all.filter((a) => !upcoming.includes(a)).reverse();
  const today = istDate();
  const month = /^\d{4}-\d{2}$/.test(sp.month ?? "") ? sp.month! : today.slice(0, 7);
  const day = /^\d{4}-\d{2}-\d{2}$/.test(sp.day ?? "") ? sp.day! : null;
  const dayList = day ? all.filter((a) => istDate(a.startsAt) === day) : [];
  const memberQ = active ? `&member=${active.id}` : "";

  const tab = "inline-flex min-h-11 items-center gap-2 rounded-md px-3.5 text-[0.9375rem] font-medium transition-colors";

  return (
    <div className="flex flex-col gap-8 animate-rise">
      <PageHeader
        illustration="patients"
        title="Appointments"
        description="Clinic visits, lab tests and video consults for everyone, with doctor, place and notes."
        actions={
          <>
            <AddAppointmentDialog members={ctx.visibleMembers.map((m) => ({ id: m.id, name: m.name }))} today={today} />
            <RoleGate action="appointments.manage" memberId={active?.id ?? null}>
              <Link href={`/appointments/book${active ? `?member=${active.id}` : ""}`} className={buttonVariants()}>
                <CalendarPlus aria-hidden="true" /> Book a doctor
              </Link>
            </RoleGate>
          </>
        }
      />
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <MemberFilter members={ctx.visibleMembers} active={active?.id ?? null} basePath={view === "calendar" ? "/appointments?view=calendar" : "/appointments"} />
        <nav aria-label="View" className="flex w-fit shrink-0 rounded-lg border border-border bg-surface p-1">
          <Link href={`/appointments?view=list${memberQ}`} aria-current={view === "list" ? "page" : undefined} className={cn(tab, view === "list" ? "bg-card shadow-soft" : "text-muted-foreground hover:text-foreground")}>
            <List className="size-[1.125rem]" aria-hidden="true" /> List
          </Link>
          <Link href={`/appointments?view=calendar${memberQ}`} aria-current={view === "calendar" ? "page" : undefined} className={cn(tab, view === "calendar" ? "bg-card shadow-soft" : "text-muted-foreground hover:text-foreground")}>
            <CalendarDays className="size-[1.125rem]" aria-hidden="true" /> Calendar
          </Link>
        </nav>
      </div>

      {view === "list" ? (
        <>
          <section aria-labelledby="up" className="flex flex-col gap-3">
            <h2 id="up" className="text-xl font-semibold">Upcoming <span className="text-base font-normal text-muted-foreground">({upcoming.length})</span></h2>
            {upcoming.length === 0 ? (
              <EmptyState
                icon={CalendarDays}
                illustration="appointments"
                title="No upcoming appointments"
                description="Book a clinic visit or a video consult with a doctor near you."
                action={<RoleGate action="appointments.manage" mode="hide"><Link href="/appointments/book" className={buttonVariants()}>Book a doctor</Link></RoleGate>}
              />
            ) : (
              <ul className="flex flex-col gap-3">{upcoming.map((a) => <AppointmentItem key={a.id} appt={a} member={active ? undefined : members.get(a.memberId)} />)}</ul>
            )}
          </section>
          {past.length > 0 && (
            <section aria-labelledby="past" className="flex flex-col gap-3">
              <h2 id="past" className="text-xl font-semibold">Past and cancelled</h2>
              <ul className="flex flex-col gap-3">{past.map((a) => <AppointmentItem key={a.id} appt={a} member={active ? undefined : members.get(a.memberId)} />)}</ul>
            </section>
          )}
        </>
      ) : (
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
          <MonthCalendar month={month} selected={day} appointments={all} members={members} baseQuery={memberQ} />
          <section aria-live="polite" className="flex flex-col gap-3">
            <h2 className="text-lg font-semibold">{day ? formatDay(day) : "Pick a day"}</h2>
            {!day ? (
              <p className="text-base text-muted-foreground">Select a date to see its appointments.</p>
            ) : dayList.length === 0 ? (
              <EmptyState compact icon={CalendarDays} title="Nothing on this day" />
            ) : (
              <ul className="flex flex-col gap-3">{dayList.map((a) => <AppointmentItem key={a.id} appt={a} member={members.get(a.memberId)} />)}</ul>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
