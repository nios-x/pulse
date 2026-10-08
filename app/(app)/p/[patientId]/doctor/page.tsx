import Link from "next/link";
import { CalendarClockIcon, StethoscopeIcon } from "lucide-react";
import { CallButtons } from "@/components/call/call-buttons";
import { BookCallForm, BookingResponse, CancelBooking } from "@/components/doctor/booking-controls";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { careTeam, listBookings } from "@/lib/booking-data";
import { BOOKING_MIN_LEAD_MINUTES, bookingPhase, type BookingPhase } from "@/lib/bookings";
import { istDate, istTime } from "@/lib/dates";
import { formatDay, formatTime } from "@/lib/format";
import { getT } from "@/lib/i18n-server";
import { now } from "@/lib/now";
import { requirePermission } from "@/lib/permissions";
import { cn } from "@/lib/utils";

const PHASE_BADGE: Record<BookingPhase, { key: `booking.phase.${BookingPhase}`; className: string }> = {
  requested: { key: "booking.phase.requested", className: "bg-warning/30 text-warning-foreground" },
  upcoming: { key: "booking.phase.upcoming", className: "bg-success/20 text-foreground" },
  now: { key: "booking.phase.now", className: "bg-success text-success-foreground" },
  missed: { key: "booking.phase.missed", className: "bg-muted text-muted-foreground" },
  declined: { key: "booking.phase.declined", className: "bg-destructive/10 text-destructive" },
  cancelled: { key: "booking.phase.cancelled", className: "bg-muted text-muted-foreground" },
};

/** Booked calls with the doctor: the family head books, the doctor accepts and attends. */
export default async function DoctorCallsPage({ params }: PageProps<"/p/[patientId]/doctor">) {
  const { patientId } = await params;
  const { user, membership, permissions } = await requirePermission(patientId, "view_summary");
  const { t, locale } = await getT();
  const current = await now();
  const [team, bookings] = await Promise.all([careTeam(patientId), listBookings(patientId)]);
  const isDoctor = membership.role === "doctor";

  const withPhase = bookings.map((b) => ({ ...b, phase: bookingPhase(b, current) }));
  const open = withPhase.filter((b) => ["requested", "upcoming", "now"].includes(b.phase)).reverse(); // soonest first
  const past = withPhase.filter((b) => !["requested", "upcoming", "now"].includes(b.phase)).slice(0, 10);
  // Same rule as the server, plus a minute for filling in the form.
  const earliest = new Date(current.getTime() + (BOOKING_MIN_LEAD_MINUTES + 1) * 60_000);
  const minWhen = `${istDate(earliest)}T${istTime(earliest)}`;
  const owner = team.family.find((m) => m.role === "owner");

  const card = (b: (typeof withPhase)[number]) => {
    const badge = PHASE_BADGE[b.phase];
    // The doctor attends their own bookings; on the family side, the member who talks,
    // whoever booked it, or the family head.
    const mine = isDoctor
      ? b.doctorId === user.id
      : user.id === b.memberId || user.id === b.bookedBy || permissions.book_call;
    // Who the viewer talks to: the doctor calls the member; the family calls the doctor.
    const callee = isDoctor ? { id: b.memberId, name: b.memberName } : { id: b.doctorId, name: b.doctorName };
    // The family joins inside the time window; the doctor may also call early once confirmed.
    const callable = mine && (b.phase === "now" || (isDoctor && b.phase === "upcoming"));
    const canCancel = permissions.book_call && ["requested", "upcoming", "now"].includes(b.phase);
    return (
      <li key={b.id} className="flex flex-col gap-3 sheet rounded-xl p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-lg font-semibold">
              {formatDay(istDate(b.scheduledAt), locale, true)}, {formatTime(b.scheduledAt, locale)}
            </p>
            <p className="text-base">{t("booking.between", { doctor: b.doctorName, member: b.memberName })}</p>
            {b.reason ? <p className="text-sm text-muted-foreground">“{b.reason}”</p> : null}
            {b.bookedByName ? (
              <p className="text-sm text-muted-foreground">{t("booking.bookedBy", { name: b.bookedByName })}</p>
            ) : null}
          </div>
          <span className={cn("shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold", badge.className)}>{t(badge.key)}</span>
        </div>
        {isDoctor && mine && b.phase === "requested" ? <BookingResponse patientId={patientId} bookingId={b.id} /> : null}
        {callable ? (
          <div className="flex items-center justify-between gap-3 rounded-lg bg-success/10 px-3 py-2">
            <span className="text-base font-medium">
              {t(b.phase === "now" ? "booking.callNow" : "booking.callEarly", { name: callee.name })}
            </span>
            <CallButtons patientId={patientId} userId={callee.id} name={callee.name} explainOffline />
          </div>
        ) : b.phase === "upcoming" ? (
          <p className="text-sm text-muted-foreground">{t("booking.opensSoon")}</p>
        ) : null}
        {canCancel ? (
          <div className="flex justify-end">
            <CancelBooking patientId={patientId} bookingId={b.id} />
          </div>
        ) : null}
      </li>
    );
  };

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="flex items-center gap-2 text-[2rem] leading-tight">
          <StethoscopeIcon className="size-6 text-primary" aria-hidden />
          {t("booking.title")}
        </h1>
        <p className="mt-1 text-muted-foreground">{isDoctor ? t("booking.subtitleDoctor") : t("booking.subtitle")}</p>
      </div>

      {team.doctors.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col gap-3">
            <p className="text-base">{t("booking.noDoctor")}</p>
            {permissions.manage_members ? (
              <Link href={`/p/${patientId}/family`} className={buttonVariants({ size: "touch" })}>
                {t("booking.inviteDoctor")}
              </Link>
            ) : null}
          </CardContent>
        </Card>
      ) : permissions.book_call ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <CalendarClockIcon className="size-5" aria-hidden />
              {t("booking.formTitle")}
            </CardTitle>
            <CardDescription>{t("booking.formHint")}</CardDescription>
          </CardHeader>
          <CardContent>
            <BookCallForm
              patientId={patientId}
              doctors={team.doctors}
              members={team.family}
              defaultMemberId={owner?.id ?? user.id}
              minWhen={minWhen}
            />
          </CardContent>
        </Card>
      ) : null}

      <section aria-labelledby="open-heading" className="flex flex-col gap-3">
        <h2 id="open-heading" className="text-xl font-semibold">
          {t("booking.open")}
        </h2>
        {open.length ? (
          <ul className="flex flex-col gap-3">{open.map(card)}</ul>
        ) : (
          <p className="rounded-2xl border-2 border-dashed border-edge-strong bg-card/50 px-4 py-6 text-center text-muted-foreground">{t("booking.none")}</p>
        )}
      </section>

      {past.length ? (
        <section aria-labelledby="past-heading" className="flex flex-col gap-3">
          <h2 id="past-heading" className="text-xl font-semibold">
            {t("booking.past")}
          </h2>
          <ul className="flex flex-col gap-3 opacity-80">{past.map(card)}</ul>
        </section>
      ) : null}
    </div>
  );
}
