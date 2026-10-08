import { DueNow } from "@/components/meds/due-now";
import { dueToday, type Clock } from "@/lib/adherence";
import { timeToMinutes } from "@/lib/dates";
import { formatSlot } from "@/lib/format";
import { getT } from "@/lib/i18n-server";
import type { Medication } from "@/db/schema";
import type { DoseLogLike } from "@/lib/adherence";

/** "Due now" for today. Renders nothing when no dose is due. */
export async function DueNowSection({
  patientId,
  meds,
  logs,
  clock,
  showEmpty = false,
  compact = false,
}: {
  patientId: string;
  meds: Medication[];
  logs: DoseLogLike[];
  clock: Clock;
  showEmpty?: boolean;
  /** Home: hide doses already taken more than 2 hours ago. */
  compact?: boolean;
}) {
  const { t, locale } = await getT();
  const byId = new Map(meds.map((m) => [m.id, m]));
  const items = dueToday(meds, logs, clock)
    .filter((d) => !compact || !d.taken || timeToMinutes(d.slot) >= clock.nowMinutes - 120)
    .map((d) => {
    const med = byId.get(d.medicationId)!;
    return { ...d, name: med.name, dose: med.dose, slotLabel: formatSlot(d.slot, locale) };
  });
  if (items.length === 0 && !showEmpty) return null;

  return (
    <section id="due" aria-labelledby="due-heading" className="flex scroll-mt-16 flex-col gap-3">
      <h2 id="due-heading" className="text-lg font-semibold">
        {t("meds.dueNow")}
      </h2>
      {items.length ? (
        <DueNow patientId={patientId} items={items} />
      ) : (
        <p className="text-muted-foreground">{t("meds.nothingDue")}</p>
      )}
    </section>
  );
}
