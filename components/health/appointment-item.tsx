import { ExternalLink, MapPin, NotebookPen, Video } from "lucide-react";
import { AppointmentActions } from "@/components/health/appointment-actions";
import { MemberAvatar } from "@/components/health/member-avatar";
import { StatusBadge } from "@/components/health/status-badge";
import type { Appointment } from "@/db/schema";
import { formatTime, istDate, nowMs, relativeDay } from "@/lib/dates";
import { cn } from "@/lib/utils";

const dayFmt = new Intl.DateTimeFormat("en-IN", { weekday: "short", timeZone: "Asia/Kolkata" });
const numFmt = new Intl.DateTimeFormat("en-IN", { day: "numeric", timeZone: "Asia/Kolkata" });
const monFmt = new Intl.DateTimeFormat("en-IN", { month: "short", timeZone: "Asia/Kolkata" });

export function AppointmentItem({ appt, member }: { appt: Appointment; member?: { name: string; tone: number } }) {
  const date = istDate(appt.startsAt);
  const rel = relativeDay(date);
  const upcoming = appt.status === "scheduled" && appt.startsAt.getTime() > nowMs() - appt.durationMin * 60_000;
  const soon = upcoming && appt.startsAt.getTime() - nowMs() < 30 * 60_000;
  return (
    <li className={cn("flex gap-4 rounded-xl border border-border bg-card p-4 sm:p-5", appt.status === "cancelled" && "opacity-70")}>
      <div className={cn("flex w-16 shrink-0 flex-col items-center justify-center rounded-lg py-2 text-center", rel === "today" && upcoming ? "bg-primary text-primary-foreground" : "bg-surface")}>
        <span className="text-xs font-medium uppercase">{dayFmt.format(appt.startsAt)}</span>
        <span className="text-2xl leading-tight font-semibold tabular">{numFmt.format(appt.startsAt)}</span>
        <span className="text-xs">{monFmt.format(appt.startsAt)}</span>
      </div>
      <div className="min-w-0 flex-1 space-y-1.5">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="text-lg leading-snug font-semibold">{appt.doctorName}</h3>
          {appt.status === "completed" && <StatusBadge tone="success" label="Done" size="sm" />}
          {appt.status === "cancelled" && <StatusBadge tone="neutral" label="Cancelled" size="sm" />}
          {upcoming && (rel === "today" || rel === "tomorrow") && <StatusBadge tone="info" label={rel === "today" ? "Today" : "Tomorrow"} size="sm" />}
        </div>
        <p className="text-[0.9375rem] text-muted-foreground">
          {[appt.specialty, appt.reason].filter(Boolean).join(" · ")}
        </p>
        <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[0.9375rem]">
          <span className="font-medium tabular">{formatTime(appt.startsAt)}</span>
          <span className="inline-flex items-center gap-1.5 text-muted-foreground">
            {appt.mode === "video" ? <Video className="size-4" aria-hidden="true" /> : <MapPin className="size-4" aria-hidden="true" />}
            {appt.mode === "video" ? "Video consult" : appt.location}
          </span>
          {member && (
            <span className="inline-flex items-center gap-1.5">
              <MemberAvatar name={member.name} tone={member.tone} size="sm" className="size-6 text-[0.625rem]" />
              {member.name.split(" ")[0]}
            </span>
          )}
        </p>
        {appt.notes && (
          <p className="flex gap-2 rounded-lg bg-surface px-3 py-2 text-[0.9375rem]">
            <NotebookPen className="mt-1 size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
            <span>{appt.notes}</span>
          </p>
        )}
        {appt.mode === "video" && appt.meetingUrl && upcoming && (
          <a
            href={appt.meetingUrl}
            target="_blank"
            rel="noreferrer"
            className={cn(
              "mt-1 inline-flex h-11 items-center gap-2 rounded-lg px-4 text-base font-medium transition-colors",
              soon ? "bg-primary text-primary-foreground hover:bg-primary-strong" : "border border-border-strong hover:bg-muted"
            )}
          >
            <Video className="size-[1.125rem]" aria-hidden="true" /> {soon ? "Join video consult now" : "Video link"}
            <ExternalLink className="size-4 opacity-70" aria-hidden="true" />
            <span className="sr-only">(opens in a new tab)</span>
          </a>
        )}
      </div>
      <AppointmentActions id={appt.id} memberId={appt.memberId} status={appt.status} label={`${appt.doctorName} on ${rel}`} />
    </li>
  );
}
