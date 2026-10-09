import { Moon, Sun, Sunrise } from "lucide-react";
import { DoseItem, type DoseItemData } from "@/components/health/dose-item";
import type { TodayDose } from "@/lib/data";
import { formatTime } from "@/lib/dates";
import { groupBySlot, SLOT_HINT, SLOT_LABEL, type DaySlot } from "@/lib/meds";

const SLOT_ICON: Record<DaySlot, typeof Sun> = { morning: Sunrise, afternoon: Sun, night: Moon };

export function toDoseItem(d: TodayDose): DoseItemData {
  return {
    key: d.key,
    medicationId: d.medicationId,
    memberId: d.memberId,
    name: d.name,
    strength: d.strength,
    instructions: d.instructions,
    time: d.time,
    date: d.date,
    state: d.state,
    loggedAtLabel: d.loggedAt ? formatTime(d.loggedAt) : null,
    loggedByName: d.loggedByName,
  };
}

/** Today's doses grouped into morning, afternoon and night. */
export function DoseList({
  doses,
  members,
  showMember = true,
}: {
  doses: TodayDose[];
  members: Map<string, { name: string; tone: number }>;
  showMember?: boolean;
}) {
  const groups = groupBySlot(doses);
  return (
    <div className="flex flex-col gap-6">
      {(Object.keys(groups) as DaySlot[]).map((slot) => {
        const list = groups[slot];
        if (!list.length) return null;
        const Icon = SLOT_ICON[slot];
        const taken = list.filter((d) => d.state === "taken").length;
        return (
          <section key={slot} aria-labelledby={`slot-${slot}`}>
            <div className="mb-3 flex items-center justify-between gap-2">
              <h3 id={`slot-${slot}`} className="flex items-center gap-2 text-base font-semibold">
                <Icon className="size-[1.125rem] text-muted-foreground" aria-hidden="true" />
                {SLOT_LABEL[slot]}
                <span className="text-sm font-normal text-muted-foreground">{SLOT_HINT[slot]}</span>
              </h3>
              <span className="text-sm text-muted-foreground tabular">
                {taken} of {list.length} done
              </span>
            </div>
            <ul className="flex flex-col gap-2">
              {list.map((d) => (
                <DoseItem key={d.key} dose={toDoseItem(d)} member={showMember ? members.get(d.memberId) : undefined} />
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
