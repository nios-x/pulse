import { and, eq } from "drizzle-orm";
import { PhoneIcon, PillIcon, ClockIcon } from "lucide-react";
import { db } from "@/db";
import { memberships, users, type Patient } from "@/db/schema";
import { buttonVariants } from "@/components/ui/button";
import { missedSinceYesterday } from "@/lib/adherence";
import { lastLogAt } from "@/lib/alerts";
import { addDays, istDate, istMinutes } from "@/lib/dates";
import { getT } from "@/lib/i18n-server";
import { loadMeds } from "@/lib/meds";
import { evaluateMissedDoses, evaluateNoLogs, safetyText } from "@/lib/safety";

/**
 * Caregiver-only rules computed on page load: 3+ missed doses since
 * yesterday, and no logs for 3 days. Nothing is stored for these.
 */
export async function CaregiverNotices({ patient, now }: { patient: Patient; now: Date }) {
  const { t, locale } = await getT();
  const clock = { today: istDate(now), nowMinutes: istMinutes(now) };
  const [{ meds, logs }, last, [owner]] = await Promise.all([
    loadMeds(patient.id, addDays(clock.today, -1)),
    lastLogAt(patient.id),
    db
      .select({ phone: users.phone })
      .from(memberships)
      .innerJoin(users, eq(memberships.userId, users.id))
      .where(and(eq(memberships.patientId, patient.id), eq(memberships.role, "owner")))
      .limit(1),
  ]);

  const missed = evaluateMissedDoses(missedSinceYesterday(meds, logs, clock));
  const silent = evaluateNoLogs(last, patient.createdAt, now);
  if (!missed && !silent) return null;

  const call = owner?.phone ? (
    <a href={`tel:${owner.phone}`} className={buttonVariants({ size: "touch", className: "shrink-0" })}>
      <PhoneIcon aria-hidden />
      {t("alert.call", { name: patient.name })}
    </a>
  ) : null;

  return (
    <div className="flex flex-col gap-2">
      {missed ? (
        <div role="status" className="flex flex-col gap-3 rounded-xl border border-warning bg-warning/20 p-4">
          <p className="flex gap-2 text-base font-semibold">
            <PillIcon className="mt-0.5 size-5 shrink-0" aria-hidden />
            {safetyText("missed_doses", locale, { name: patient.name, count: missed.count })}
          </p>
          {call}
        </div>
      ) : null}
      {silent ? (
        <div role="status" className="flex flex-col gap-3 rounded-xl border border-warning bg-warning/20 p-4">
          <p className="flex gap-2 text-base font-semibold">
            <ClockIcon className="mt-0.5 size-5 shrink-0" aria-hidden />
            {safetyText("no_logs", locale, { name: patient.name, days: silent.days })}
          </p>
          {call}
        </div>
      ) : null}
    </div>
  );
}
