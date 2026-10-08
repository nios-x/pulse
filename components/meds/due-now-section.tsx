import { DueNow } from "@/components/meds/due-now";
import { DUE_EARLY_MINUTES, dueToday, isScheduled, takenSet, type Clock } from "@/lib/adherence";
import { timeToMinutes } from "@/lib/dates";
import { formatSlot } from "@/lib/format";
import { getT } from "@/lib/i18n-server";
import type { Medication } from "@/db/schema";
import type { DoseLogLike } from "@/lib/adherence";

/**
 * "Due now" for today. Renders nothing when no dose is due.
 * `allDay` lists every dose scheduled today instead, so later ones can be ticked early.
 */
export async function DueNowSection({
  patientId,
  meds,
  logs,
  clock,
  showEmpty = false,
  compact = false,
  allDay = false,
}: {
  patientId: string;
  meds: Medication[];
  logs: DoseLogLike[];
  clock: Clock;
  showEmpty?: boolean;
  /** Home: hide doses already taken more than 2 hours ago. */
  compact?: boolean;
  allDay?: boolean;
}) {
  const { t, locale } = await getT();
  const byId = new Map(meds.map((m) => [m.id, m]));
  const doses = allDay ? scheduledToday(meds, logs, clock) : dueToday(meds, logs, clock);
  const items = doses
    .filter((d) => !compact || !d.taken || timeToMinutes(d.slot) >= clock.nowMinutes - 120)
    .map((d) => {
    const med = byId.get(d.medicationId)!;
    return {
      ...d,
      name: med.name,
      dose: med.dose,
      slotLabel: formatSlot(d.slot, locale),
      due: timeToMinutes(d.slot) - DUE_EARLY_MINUTES <= clock.nowMinutes,
    };
  });
  if (items.length === 0 && !showEmpty) return null;

  return (
    <section id="due" aria-labelledby="due-heading" className="flex scroll-mt-16 flex-col gap-3">
      <h2 id="due-heading" className="text-xl font-semibold">
        {t(allDay ? "meds.today" : "meds.dueNow")}
      </h2>
      {items.length ? (
        <DueNow patientId={patientId} items={items} />
      ) : (
        <p className="text-ink-3">{t("meds.nothingDue")}</p>
      )}
    </section>
  );
}

function scheduledToday(meds: Medication[], logs: DoseLogLike[], clock: Clock) {
  const taken = takenSet(logs);
  return meds
    .filter((m) => m.active && isScheduled(m, clock.today))
    .flatMap((m) =>
      m.times.map((slot) => ({ medicationId: m.id, slot, taken: taken.has(`${m.id}|${clock.today}|${slot}`) }))
    )
    .sort((a, b) => a.slot.localeCompare(b.slot));
}
