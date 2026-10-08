import { APP_TIME_ZONE } from "@/lib/dates";
import type { Locale } from "@/lib/i18n";

const intlLocale = (locale: Locale) => (locale === "hi" ? "hi-IN" : "en-IN");

/** "8:10 am" in India time. */
export function formatTime(d: Date, locale: Locale): string {
  return new Intl.DateTimeFormat(intlLocale(locale), {
    timeZone: APP_TIME_ZONE,
    hour: "numeric",
    minute: "2-digit",
  }).format(d);
}

/** "8 Oct" for a "YYYY-MM-DD" India date. */
export function formatDay(date: string, locale: Locale, withWeekday = false): string {
  return new Intl.DateTimeFormat(intlLocale(locale), {
    timeZone: "UTC",
    day: "numeric",
    month: "short",
    ...(withWeekday ? { weekday: "short" } : {}),
  }).format(new Date(`${date}T00:00:00Z`));
}

/** "08:00" -> "8 am" */
export function formatSlot(slot: string, locale: Locale): string {
  const [h, m] = slot.split(":").map(Number);
  return new Intl.DateTimeFormat(intlLocale(locale), {
    timeZone: "UTC",
    hour: "numeric",
    minute: m ? "2-digit" : undefined,
  }).format(new Date(Date.UTC(2000, 0, 1, h, m)));
}

/** 390 minutes -> "6.5". Whole hours have no decimal. */
export function formatHours(minutes: number): string {
  return String(Math.round(minutes / 6) / 10);
}
