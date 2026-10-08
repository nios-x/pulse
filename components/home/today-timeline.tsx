import { DropletIcon, FootprintsIcon, PillIcon, UtensilsIcon } from "lucide-react";
import { describeDetected } from "@/lib/food-photo";
import { foodLabel } from "@/lib/foods";
import { formatHours, formatSlot, formatTime } from "@/lib/format";
import { getT } from "@/lib/i18n-server";
import { whoLogged, type TimelineItem } from "@/lib/timeline";

export async function TodayTimeline({
  items,
  viewerId,
  ownerUserId,
  patientName,
}: {
  items: TimelineItem[];
  viewerId: string;
  ownerUserId: string | null;
  patientName: string;
}) {
  const { t, locale } = await getT();

  if (items.length === 0) {
    return <p className="rounded-2xl border-2 border-dashed border-edge-strong bg-card/50 px-4 py-6 text-center text-muted-foreground">{t("timeline.empty")}</p>;
  }

  return (
    <ol className="flex flex-col divide-y divide-edge sheet rounded-xl">
      {items.map((item) => {
        const who = whoLogged({ ...item, viewerId, ownerUserId, patientName });
        let icon;
        let tint = "bg-violet-wash";
        let title: string;
        switch (item.kind) {
          case "reading":
            icon = <DropletIcon className="size-5 text-alert" aria-hidden />;
            tint = "bg-alert-wash";
            title = t("timeline.reading", { mgdl: item.mgdl, context: t(`context.${item.context}`) });
            break;
          case "meal":
            icon = <UtensilsIcon className="size-5 text-watch" aria-hidden />;
            tint = "bg-watch-wash";
            // Photo-logged meals name the actual dishes; chip-logged ones use the food list.
            title = `${t(`slot.${item.slot}`)}: ${
              item.details?.length
                ? item.details.map((d) => describeDetected(d, locale)).join(", ")
                : item.items.map((k) => foodLabel(k, locale)).join(", ")
            }`;
            break;
          case "dose":
            icon = <PillIcon className="size-5 text-violet" aria-hidden />;
            tint = "bg-violet-wash";
            title = t("timeline.dose", { med: `${item.medName} ${item.dose}`.trim(), slot: formatSlot(item.slot, locale) });
            break;
          case "checkin": {
            icon = <FootprintsIcon className="size-5 text-go" aria-hidden />;
            tint = "bg-mint-wash";
            const parts = [];
            if (item.steps !== null)
              parts.push(t("timeline.steps", { steps: item.steps.toLocaleString(locale === "hi" ? "en-IN" : "en-US") }));
            else if (item.walked !== null) parts.push(item.walked ? t("timeline.walked") : t("timeline.notWalked"));
            if (item.sleepMinutes !== null) parts.push(t("timeline.sleep", { hours: formatHours(item.sleepMinutes) }));
            title = parts.join(" · ");
            break;
          }
        }
        return (
          <li key={`${item.kind}-${item.id}`} className="flex gap-3.5 px-4 py-3.5">
            <span className={`mt-0.5 flex size-10 shrink-0 items-center justify-center rounded-xl ${tint}`}>{icon}</span>
            <div className="min-w-0">
              <p className="text-base leading-snug font-medium text-plum">{title}</p>
              <p className="text-sm text-ink-3">
                {t(who.key, who.vars)}, {formatTime(item.at, locale)}
              </p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
