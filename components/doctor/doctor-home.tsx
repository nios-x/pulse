import Link from "next/link";
import { CalendarClockIcon, ChevronRightIcon, StethoscopeIcon } from "lucide-react";
import { AssistantLink } from "@/components/assistant/assistant-link";
import { CallButtons } from "@/components/call/call-buttons";
import { BookingResponse } from "@/components/doctor/booking-controls";
import { MemberCard } from "@/components/health/member-card";
import { StatusBadge } from "@/components/health/status-badge";
import { JoinCodeForm } from "@/components/profile/join-code-form";
import { BlobBadge, PebbleScatter } from "@/components/shapes/shapes";
import { callsForDoctor } from "@/lib/booking-data";
import { JOIN_LATE_MINUTES, bookingPhase } from "@/lib/bookings";
import { loadFamily } from "@/lib/family";
import { istDate } from "@/lib/dates";
import { formatDay, formatTime } from "@/lib/format";
import { getT } from "@/lib/i18n-server";

/** A doctor's home: booked calls (answer, then call from here), then every patient they look after. */
export async function DoctorHome() {
  const { t, locale } = await getT();
  const { user, members, current } = await loadFamily();
  const calls = (await callsForDoctor(user.id, new Date(current.getTime() - JOIN_LATE_MINUTES * 60_000))).map((c) => ({
    ...c,
    phase: bookingPhase(c, current),
  }));
  const waiting = calls.filter((c) => c.phase === "requested").length;
  // Patients first, then any family the doctor also belongs to in another role.
  const patients = [...members].sort((a, b) => Number(a.role !== "doctor") - Number(b.role !== "doctor"));

  return (
    <>
      <p className="flex items-center gap-2 font-heading text-sm font-semibold text-violet">
        <StethoscopeIcon className="size-4" aria-hidden />
        {t("auth.accountType.doctor")}
      </p>
      <h1 className="mt-1 text-[2rem] leading-tight">{t("home.welcome", { name: user.name })}</h1>

      <section aria-labelledby="calls-heading" className="mt-6 flex flex-col gap-3">
        <h2 id="calls-heading" className="text-xl font-semibold">
          {t("doctorHome.calls")}
          {waiting ? <span className="font-normal text-ink-2"> · {t("doctorHome.waiting", { count: waiting })}</span> : null}
        </h2>
        {calls.length ? (
          <ul className="flex flex-col gap-3">
            {calls.map((c) => (
              <li key={c.id} className="sheet flex flex-col gap-3 rounded-2xl p-4">
                <Link href={`/p/${c.patientId}/doctor`} className="flex items-start gap-3 rounded-xl hover:bg-well/40">
                  <CalendarClockIcon className="mt-0.5 size-5 shrink-0 text-violet" aria-hidden />
                  <span className="min-w-0 flex-1">
                    <span className="block text-base font-semibold">
                      {formatDay(istDate(c.scheduledAt), locale, true)}, {formatTime(c.scheduledAt, locale)}
                    </span>
                    <span className="block truncate text-sm text-ink-2">
                      {t("doctorHome.requestFrom", { member: c.memberName, patient: c.patientName })}
                      {c.reason ? ` · “${c.reason}”` : ""}
                    </span>
                  </span>
                  <StatusBadge tone={c.phase === "requested" ? "watch" : "ok"} size="sm">
                    {c.phase === "requested" ? t("doctorHome.needsAnswer") : t(`booking.phase.${c.phase}`)}
                  </StatusBadge>
                  <ChevronRightIcon className="mt-0.5 size-5 shrink-0 text-ink-3" aria-hidden />
                </Link>
                {c.phase === "requested" ? (
                  <BookingResponse patientId={c.patientId} bookingId={c.id} />
                ) : (
                  <div className="flex items-center justify-between gap-3 rounded-lg bg-success/10 px-3 py-2">
                    <span className="text-base font-medium">
                      {t(c.phase === "now" ? "booking.callNow" : "booking.callEarly", { name: c.memberName })}
                    </span>
                    <CallButtons patientId={c.patientId} userId={c.memberId} name={c.memberName} explainOffline />
                  </div>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <p className="sheet flex items-center gap-3 rounded-2xl p-4 text-base text-ink-2">
            <CalendarClockIcon className="size-5 shrink-0 text-violet" aria-hidden />
            {t("doctorHome.noCalls")}
          </p>
        )}
      </section>

      <section aria-labelledby="patients-heading" className="mt-6 flex flex-col gap-3">
        <h2 id="patients-heading" className="text-xl font-semibold">
          {t("doctorHome.patients")}
        </h2>
        {patients.length ? (
          <div className="flex flex-col gap-3">
            {patients.map((m) => (
              <MemberCard key={m.id} member={m} t={t} />
            ))}
          </div>
        ) : (
          <div className="sheet relative overflow-hidden rounded-2xl p-5 pt-6">
            <PebbleScatter />
            <BlobBadge seed={8} className="relative size-20">
              <StethoscopeIcon aria-hidden />
            </BlobBadge>
            <p className="relative mt-4 text-lg font-semibold text-plum">{t("doctorHome.emptyTitle")}</p>
            <p className="relative mt-1 text-base text-ink-2">{t("doctorHome.emptyBody")}</p>
          </div>
        )}
      </section>

      <AssistantLink patientId={null} className="mt-6" />

      <div className="sheet mt-6 rounded-2xl p-4">
        <JoinCodeForm />
        <p className="mt-2 text-sm text-ink-3">{t("doctorHome.codeHint")}</p>
      </div>
    </>
  );
}
