// Pulse is India-only, so "today", dose times and charts use India time
// (UTC+05:30, no daylight saving) no matter where the server runs.

export const APP_TIME_ZONE = "Asia/Kolkata";
const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

/** "YYYY-MM-DD" for the India calendar day of `d`. */
export function istDate(d: Date): string {
  return new Date(d.getTime() + IST_OFFSET_MS).toISOString().slice(0, 10);
}

/** "HH:MM" India clock time of `d`. */
export function istTime(d: Date): string {
  return new Date(d.getTime() + IST_OFFSET_MS).toISOString().slice(11, 16);
}

/** Minutes since India midnight. */
export function istMinutes(d: Date): number {
  const [h, m] = istTime(d).split(":").map(Number);
  return h * 60 + m;
}

/** The instant for an India date + "HH:MM". */
export function istDateTime(date: string, time = "00:00"): Date {
  return new Date(`${date}T${time}:00+05:30`);
}

/** Shift a "YYYY-MM-DD" date by whole days. */
export function addDays(date: string, days: number): string {
  return new Date(Date.parse(`${date}T00:00:00Z`) + days * DAY_MS).toISOString().slice(0, 10);
}

/** Whole days from date a to date b (b - a). */
export function daysBetween(a: string, b: string): number {
  return Math.round((Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / DAY_MS);
}

/** 0 = Sunday ... 1 = Monday, for an India date. */
export function weekday(date: string): number {
  return new Date(`${date}T00:00:00Z`).getUTCDay();
}

/** Inclusive list of dates from `from` to `to`. */
export function dateRange(from: string, to: string): string[] {
  const out: string[] = [];
  for (let d = from; d <= to; d = addDays(d, 1)) out.push(d);
  return out;
}

export function timeToMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}
