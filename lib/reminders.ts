// Which dose reminders are due right now. Pure: the cron route loads the data,
// this decides, and sent_reminders stops any reminder going out twice.

import { isScheduled, takenSet, type Clock, type DoseLogLike, type MedLike } from "@/lib/adherence";
import { addDays, timeToMinutes } from "@/lib/dates";

/** The caregiver nudge goes out this long after an untaken dose. */
export const LATE_AFTER_MINUTES = 60;
/** How far back a run looks, so a delayed or skipped cron run still catches up. */
export const CATCH_UP_MINUTES = 60;

export type Reminder = { medicationId: string; date: string; slot: string; kind: "due" | "late" };

/**
 * "due": the dose time has come (to the patient).
 * "late": still not taken an hour later (to caregivers, and family with the meds scope).
 * Only untaken doses, only within the catch-up window. Yesterday is checked too,
 * so a late-evening dose still gets its nudge after midnight.
 * Pass dose logs for yesterday and today.
 */
export function remindersDue(meds: readonly MedLike[], logs: readonly DoseLogLike[], clock: Clock): Reminder[] {
  const taken = takenSet(logs);
  const out: Reminder[] = [];
  const inWindow = (minute: number) => minute <= clock.nowMinutes && minute > clock.nowMinutes - CATCH_UP_MINUTES;
  // Minutes are counted from today's midnight, so yesterday's slots are negative.
  const days = [
    { date: addDays(clock.today, -1), offset: -24 * 60 },
    { date: clock.today, offset: 0 },
  ];
  for (const med of meds) {
    if (!med.active) continue;
    for (const { date, offset } of days) {
      if (!isScheduled(med, date)) continue;
      for (const slot of med.times) {
        if (taken.has(`${med.id}|${date}|${slot}`)) continue;
        const at = timeToMinutes(slot) + offset;
        if (inWindow(at)) out.push({ medicationId: med.id, date, slot, kind: "due" });
        if (inWindow(at + LATE_AFTER_MINUTES)) out.push({ medicationId: med.id, date, slot, kind: "late" });
      }
    }
  }
  return out;
}
