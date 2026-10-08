import { DropletIcon, FootprintsIcon, PillIcon, UtensilsIcon } from "lucide-react";
import { foodLabel } from "@/lib/foods";
import { formatSlot, formatTime } from "@/lib/format";
import { getT } from "@/lib/i18n-server";
import { whoLogged, type TimelineItem } from "@/lib/timeline";

const SLEEP_KEYS = { 1: "sleep.bad", 2: "sleep.okay", 3: "sleep.good" } as const;

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
    return <p className="rounded-xl border border-dashed px-4 py-6 text-center text-muted-foreground">{t("timeline.empty")}</p>;
  }

  return (
    <ol className="flex flex-col divide-y rounded-xl border bg-card">
      {items.map((item) => {
        const who = whoLogged({ ...item, viewerId, ownerUserId, patientName });
        let icon;
        let title: string;
        switch (item.kind) {
          case "reading":
            icon = <DropletIcon className="size-5 text-destructive" aria-hidden />;
            title = t("timeline.reading", { mgdl: item.mgdl, context: t(`context.${item.context}`) });
            break;
          case "meal":
            icon = <UtensilsIcon className="size-5 text-chart-2" aria-hidden />;
            title = `${t(`slot.${item.slot}`)}: ${item.items.map((k) => foodLabel(k, locale)).join(", ")}`;
            break;
          case "dose":
            icon = <PillIcon className="size-5 text-primary" aria-hidden />;
            title = t("timeline.dose", { med: `${item.medName} ${item.dose}`.trim(), slot: formatSlot(item.slot, locale) });
            break;
          case "checkin": {
            icon = <FootprintsIcon className="size-5 text-success" aria-hidden />;
            const parts = [];
            if (item.walked !== null) parts.push(item.walked ? t("timeline.walked") : t("timeline.notWalked"));
            if (item.sleep) parts.push(`${t("log.sleep")}: ${t(SLEEP_KEYS[item.sleep as 1 | 2 | 3])}`);
            title = parts.join(" · ");
            break;
          }
        }
        return (
          <li key={`${item.kind}-${item.id}`} className="flex gap-3 px-4 py-3">
            <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-full bg-muted">{icon}</span>
            <div className="min-w-0">
              <p className="text-base leading-snug font-medium">{title}</p>
              <p className="text-sm text-muted-foreground">
                {t(who.key, who.vars)}, {formatTime(item.at, locale)}
              </p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
