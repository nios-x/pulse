import Link from "next/link";
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  CircleAlertIcon,
  CircleCheckIcon,
  FootprintsIcon,
  TriangleAlertIcon,
  type LucideIcon,
} from "lucide-react";
import { StatusBadge } from "@/components/health/status-badge";
import { addMonths, monthOf, type DayMark, type DayReason, type MarkedDay } from "@/lib/day-marks";
import { formatDay } from "@/lib/format";
import type { Locale, Translate } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import type { Tone } from "@/lib/vitals";

type Shown = Exclude<DayMark, "future">;

const MARKS: Record<Shown, { icon: LucideIcon | null; tone: Tone; cell: string; ink: string }> = {
  alert: {
    icon: CircleAlertIcon,
    tone: "alert",
    cell: "bg-alert-wash text-alert-ink font-semibold ring-1 ring-inset ring-alert/40",
    ink: "text-alert-ink",
  },
  watch: { icon: TriangleAlertIcon, tone: "watch", cell: "bg-watch-wash text-watch-ink", ink: "text-watch-ink" },
  good: { icon: CircleCheckIcon, tone: "ok", cell: "bg-ok-wash text-ok-ink", ink: "text-ok-ink" },
  empty: { icon: null, tone: "neutral", cell: "text-ink-2 hover:bg-well", ink: "text-ink-3" },
};
const ORDER: Shown[] = ["good", "watch", "alert", "empty"];

const intlLocale = (locale: Locale) => (locale === "hi" ? "hi-IN" : "en-IN");

function reasonText(r: DayReason, t: Translate): string {
  switch (r.kind) {
    case "low":
    case "high":
      return t(`cal.r.${r.kind}`, { mgdl: r.mgdl });
    case "walked":
      return t("cal.r.walked");
    default:
      return t(`cal.r.${r.kind}`, { count: r.count });
  }
}

/**
 * A month of days, each marked by the rules in lib/day-marks.ts. Server-rendered
 * links, so it works before JavaScript: tapping a day shows why it got its mark.
 */
export function MonthCalendar({
  marks,
  month,
  today,
  selected,
  patientId,
  t,
  locale,
}: {
  marks: { weeks: (MarkedDay | null)[][]; days: MarkedDay[] };
  month: string;
  today: string;
  selected: string | null;
  patientId: string;
  t: Translate;
  locale: Locale;
}) {
  const href = (m: string, d?: string) => `/home?p=${patientId}&m=${m}${d ? `&d=${d}` : ""}`;
  const monthLabel = new Intl.DateTimeFormat(intlLocale(locale), { timeZone: "UTC", month: "long", year: "numeric" }).format(
    new Date(`${month}-01T00:00:00Z`)
  );
  // 2026-10-04 was a Sunday: the header runs Sunday to Saturday like the grid.
  const weekdays = Array.from({ length: 7 }, (_, i) => new Date(Date.UTC(2026, 9, 4 + i)));
  const fmtWeekday = (style: "short" | "long") =>
    new Intl.DateTimeFormat(intlLocale(locale), { timeZone: "UTC", weekday: style });
  const counts = Object.fromEntries(ORDER.map((m) => [m, marks.days.filter((d) => d.mark === m).length]));
  const picked =
    marks.days.find((d): d is MarkedDay & { mark: Shown } => d.date === selected && d.mark !== "future") ?? null;
  const isCurrent = month === monthOf(today);

  return (
    <section aria-labelledby="cal-heading" className="sheet flex flex-col gap-4 rounded-2xl p-4 pt-5">
      <div className="flex items-center justify-between gap-2">
        <h2 id="cal-heading" className="text-xl font-semibold">
          {t("cal.title")}
        </h2>
        <div className="flex items-center">
          <Link
            href={href(addMonths(month, -1))}
            scroll={false}
            aria-label={t("cal.prev")}
            className="grid size-11 place-items-center rounded-full text-ink-2 hover:bg-well"
          >
            <ChevronLeftIcon className="size-5" aria-hidden />
          </Link>
          <p className="min-w-28 text-center font-heading text-base font-semibold text-plum" aria-live="polite">
            {monthLabel}
          </p>
          {isCurrent ? (
            <span className="size-11" aria-hidden />
          ) : (
            <Link
              href={href(addMonths(month, 1))}
              scroll={false}
              aria-label={t("cal.next")}
              className="grid size-11 place-items-center rounded-full text-ink-2 hover:bg-well"
            >
              <ChevronRightIcon className="size-5" aria-hidden />
            </Link>
          )}
        </div>
      </div>

      <table className="-mx-1 w-[calc(100%+0.5rem)] table-fixed border-separate border-spacing-1">
        <caption className="sr-only">
          {t("cal.title")}, {monthLabel}
        </caption>
        <thead>
          <tr>
            {weekdays.map((d) => (
              <th
                key={d.getTime()}
                scope="col"
                abbr={fmtWeekday("long").format(d)}
                className="pb-1 text-center text-xs font-medium text-ink-3"
              >
                {fmtWeekday("short").format(d)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {marks.weeks.map((week, i) => (
            <tr key={i}>
              {week.map((day, j) => {
                if (!day) return <td key={j} />;
                const n = Number(day.date.slice(8));
                if (day.mark === "future") {
                  return (
                    <td key={day.date}>
                      <span className="flex h-13 items-start justify-center pt-2 text-base text-ink-3/60 tabular">{n}</span>
                    </td>
                  );
                }
                const { icon: Icon, cell } = MARKS[day.mark];
                const label = [formatDay(day.date, locale, true), t(`cal.mark.${day.mark}`), day.walked ? t("cal.r.walked") : null]
                  .filter(Boolean)
                  .join(", ");
                return (
                  <td key={day.date}>
                    <Link
                      href={href(month, day.date)}
                      scroll={false}
                      aria-label={label}
                      aria-current={day.date === today ? "date" : undefined}
                      className={cn(
                        "flex h-13 flex-col items-center justify-start gap-0.5 rounded-xl pt-1.5 text-base tabular transition-colors",
                        cell,
                        day.date === selected && "outline-2 outline-offset-1 outline-plum"
                      )}
                    >
                      <span
                        className={cn(
                          day.date === today && "font-bold text-violet-deep underline decoration-2 underline-offset-4"
                        )}
                      >
                        {n}
                      </span>
                      <span className="flex h-3.5 items-center gap-0.5" aria-hidden>
                        {Icon ? <Icon className="size-3.5" /> : null}
                        {day.walked ? <FootprintsIcon className="size-3 text-violet" /> : null}
                      </span>
                    </Link>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>

      <ul className="flex flex-wrap gap-x-4 gap-y-2 text-sm text-ink-2" aria-label={t("cal.legend")}>
        {ORDER.map((m) => {
          const { icon: Icon, ink } = MARKS[m];
          return (
            <li key={m} className="flex items-center gap-1.5">
              {Icon ? (
                <Icon className={cn("size-4", ink)} aria-hidden />
              ) : (
                <span className="size-4 rounded-full border border-edge-strong" aria-hidden />
              )}
              {t(`cal.mark.${m}`)}
              <span className="font-semibold text-plum tabular">{counts[m]}</span>
            </li>
          );
        })}
        <li className="flex items-center gap-1.5">
          <FootprintsIcon className="size-4 text-violet" aria-hidden />
          {t("cal.r.walked")}
          <span className="font-semibold text-plum tabular">{marks.days.filter((d) => d.walked).length}</span>
        </li>
      </ul>

      <div className="well rounded-xl p-4" aria-live="polite">
        {picked ? (
          <div className="flex flex-col gap-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="font-heading text-base font-semibold text-plum">{formatDay(picked.date, locale, true)}</h3>
              <StatusBadge tone={MARKS[picked.mark].tone} size="sm">
                {t(`cal.mark.${picked.mark}`)}
              </StatusBadge>
            </div>
            {picked.reasons.length > 0 ? (
              <ul className="flex list-disc flex-col gap-1 pl-5 text-base text-ink-2">
                {picked.reasons.map((r) => (
                  <li key={r.kind}>{reasonText(r, t)}</li>
                ))}
              </ul>
            ) : (
              <p className="text-base text-ink-2">{t("cal.r.nothing")}</p>
            )}
          </div>
        ) : (
          <p className="text-base text-ink-2">{t("cal.pick")}</p>
        )}
      </div>

      <details className="group text-sm text-ink-2">
        <summary className="action-link flex min-h-11 cursor-pointer items-center">{t("cal.rules.title")}</summary>
        <ol className="flex list-decimal flex-col gap-1.5 pl-5 leading-snug">
          <li>{t("cal.rules.alert")}</li>
          <li>{t("cal.rules.watch")}</li>
          <li>{t("cal.rules.good")}</li>
          <li>{t("cal.rules.empty")}</li>
        </ol>
      </details>
    </section>
  );
}
