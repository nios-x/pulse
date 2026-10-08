// Which dose reminders are due right now. Pure: the cron route loads the data,
// this decides, and sent_reminders stops any reminder going out twice.

import { isScheduled, takenSet, type Clock, type DoseLogLike, type MedLike } from "@/lib/adherence";
import { timeToMinutes } from "@/lib/dates";

/** The caregiver nudge goes out this long after an untaken dose. */
export const LATE_AFTER_MINUTES = 60;
/** How far back a run looks, so a delayed or skipped cron run still catches up. */
export const CATCH_UP_MINUTES = 60;

export type Reminder = { medicationId: string; date: string; slot: string; kind: "due" | "late" };

/**
 * "due": the dose time has come (to the patient).
 * "late": still not taken an hour later (to caregivers, and family with the meds scope).
 * Only today's slots, only untaken doses, only within the catch-up window.
 */
export function remindersDue(meds: readonly MedLike[], logs: readonly DoseLogLike[], clock: Clock): Reminder[] {
  const taken = takenSet(logs);
  const out: Reminder[] = [];
  const inWindow = (minute: number) => minute <= clock.nowMinutes && minute > clock.nowMinutes - CATCH_UP_MINUTES;
  for (const med of meds) {
    if (!med.active || !isScheduled(med, clock.today)) continue;
    for (const slot of med.times) {
      if (taken.has(`${med.id}|${clock.today}|${slot}`)) continue;
      const at = timeToMinutes(slot);
      if (inWindow(at)) out.push({ medicationId: med.id, date: clock.today, slot, kind: "due" });
      if (inWindow(at + LATE_AFTER_MINUTES)) out.push({ medicationId: med.id, date: clock.today, slot, kind: "late" });
    }
  }
  return out;
}
