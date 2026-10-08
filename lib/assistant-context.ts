import "server-only";
import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { glucoseReadings } from "@/db/schema";
import { doseStatus, isScheduled, takenSet, type DoseStatus } from "@/lib/adherence";
import type { AssistantContext } from "@/lib/assistant";
import type { CurrentUser } from "@/lib/auth";
import { nextBooking } from "@/lib/booking-data";
import { istDate, istMinutes, timeToMinutes } from "@/lib/dates";
import { formatDay, formatSlot, formatTime } from "@/lib/format";
import { createT, type Locale } from "@/lib/i18n";
import { loadMeds } from "@/lib/meds";
import { getAccess } from "@/lib/permissions";
import { glucoseStatus } from "@/lib/vitals";

const READINGS = 5;

/**
 * What the assistant may know: the open profile's recent readings, today's doses and the
 * next doctor call, each only when this person's permissions show it in the app.
 */
export async function loadAssistantContext(
  user: CurrentUser,
  patientId: string | null,
  locale: Locale,
  current: Date
): Promise<AssistantContext> {
  const access = patientId ? await getAccess(patientId) : null;
  const base = { userName: user.name, isDoctor: user.isDoctor };
  if (!access || !access.permissions.view_summary) return { ...base, patient: null };

  const t = createT(locale);
  const { patient, permissions: can, membership } = access;
  const today = istDate(current);
  const clock = { today, nowMinutes: istMinutes(current) };
  const when = (d: Date) => `${formatDay(istDate(d), locale, true)}, ${formatTime(d, locale)}`;

  const [readings, meds, next] = await Promise.all([
    can.view_vitals
      ? db
          .select({ mgdl: glucoseReadings.mgdl, context: glucoseReadings.context, at: glucoseReadings.measuredAt })
          .from(glucoseReadings)
          .where(eq(glucoseReadings.patientId, patient.id))
          .orderBy(desc(glucoseReadings.measuredAt))
          .limit(READINGS)
      : null,
    can.view_meds || can.mark_dose ? loadMeds(patient.id, today) : null,
    nextBooking(patient.id, new Date(current.getTime() - 60 * 60_000)),
  ]);

  const doseWord = (status: DoseStatus, slot: string) =>
    status === "taken"
      ? t("dose.state.taken")
      : status === "due" && timeToMinutes(slot) + 60 < clock.nowMinutes
        ? t("dose.state.late")
        : status === "due"
          ? t("dose.state.due")
          : t("dose.state.later");
  const taken = meds ? takenSet(meds.logs) : null;

  return {
    ...base,
    patient: {
      name: patient.name,
      yourRole: membership.role,
      isYou: membership.role === "owner",
      limits: { low: patient.glucoseLow, high: patient.glucoseHigh },
      readings: readings?.map((r) => ({
        when: when(r.at),
        mgdl: r.mgdl,
        context: t(`context.${r.context}`),
        status: t(`vital.${glucoseStatus(r.mgdl, r.context, patient).label}`),
      })),
      doses:
        meds && taken
          ? meds.meds
              .filter((m) => isScheduled(m, today))
              .flatMap((m) => m.times.map((slot) => ({ m, slot })))
              .sort((a, b) => a.slot.localeCompare(b.slot))
              .map(({ m, slot }) => ({
                med: `${m.name} ${m.dose}`.trim(),
                slot: formatSlot(slot, locale),
                status: doseWord(doseStatus({ date: today, slot, taken: taken.has(`${m.id}|${today}|${slot}`), clock }), slot),
              }))
          : undefined,
      nextCall: next
        ? {
            when: when(next.scheduledAt),
            with: `${next.doctorName} / ${next.memberName}`,
            status: next.status === "accepted" ? t("booking.phase.upcoming") : t("booking.phase.requested"),
          }
        : null,
    },
  };
}
