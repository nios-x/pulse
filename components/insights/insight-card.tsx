import { FootprintsIcon, PillIcon, TrendingDownIcon, TrendingUpIcon, MinusIcon, UtensilsIcon } from "lucide-react";
import { foodLabel } from "@/lib/foods";
import type { Translate, Locale } from "@/lib/i18n";
import type { Insight } from "@/lib/insights";
import { safetyText } from "@/lib/safety";

/** The sentence for one insight. Wording says "seems to"; numbers are plain averages. */
export function insightText(insight: Insight, t: Translate, locale: Locale): { title: string; body: string } {
  // Food names sit mid-sentence: "after dinners with rice".
  const food = (key: string) => (locale === "en" ? foodLabel(key, locale).toLowerCase() : foodLabel(key, locale));
  switch (insight.kind) {
    case "meal":
      return {
        title: t("insight.mealTitle"),
        body: t(insight.slot === "dinner" ? "insight.mealDinner" : "insight.meal", {
          high: food(insight.highItem),
          low: food(insight.lowItem),
          highAvg: insight.highAvg,
          lowAvg: insight.lowAvg,
        }),
      };
    case "walk":
      return {
        title: t("insight.walkTitle"),
        body: t(insight.walkedAvg < insight.restAvg ? "insight.walkLower" : "insight.walkHigher", {
          walked: insight.walkedAvg,
          rest: insight.restAvg,
        }),
      };
    case "medicine":
      return {
        title: t("insight.medsTitle"),
        body: t("insight.meds", { good: insight.goodAvg, low: insight.lowAvg }),
      };
    case "trend":
      return {
        title: t("insight.trendTitle"),
        body: t(`insight.trend.${insight.direction}`, { now: insight.thisAvg, last: insight.lastAvg }),
      };
  }
}

const ICONS = { meal: UtensilsIcon, walk: FootprintsIcon, medicine: PillIcon } as const;

export function InsightCard({ insight, t, locale }: { insight: Insight; t: Translate; locale: Locale }) {
  const { title, body } = insightText(insight, t, locale);
  const Icon =
    insight.kind === "trend"
      ? insight.direction === "up"
        ? TrendingUpIcon
        : insight.direction === "down"
          ? TrendingDownIcon
          : MinusIcon
      : ICONS[insight.kind];
  return (
    <article className="flex flex-col gap-2 rounded-xl border bg-card p-4">
      <h3 className="flex items-center gap-2 text-base font-semibold">
        <Icon className="size-5 text-chart-1" aria-hidden />
        {title}
      </h3>
      <p className="text-lg leading-snug">{body}</p>
      <p className="text-sm text-muted-foreground">{safetyText("insight_disclaimer", locale)}</p>
    </article>
  );
}
