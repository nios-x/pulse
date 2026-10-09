/**
 * All schedule maths happen in India time (UTC+5:30, no daylight saving),
 * whatever timezone the server or the browser runs in.
 */
export const IST_OFFSET_MIN = 330;
export const TIME_ZONE = "Asia/Kolkata";

/** YYYY-MM-DD for the given instant, in India time. */
export function istDate(d: Date = new Date()): string {
  const shifted = new Date(d.getTime() + IST_OFFSET_MIN * 60_000);
  return shifted.toISOString().slice(0, 10);
}

/** HH:MM for the given instant, in India time. */
export function istTime(d: Date = new Date()): string {
  const shifted = new Date(d.getTime() + IST_OFFSET_MIN * 60_000);
  return shifted.toISOString().slice(11, 16);
}

/** The instant for a India-time date and HH:MM. */
export function fromIst(date: string, time = "00:00"): Date {
  return new Date(`${date}T${time}:00+05:30`);
}

/** Adds whole days to a YYYY-MM-DD date. */
export function addDays(date: string, days: number): string {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** 0 (Sunday) to 6, for a YYYY-MM-DD date. */
export function weekday(date: string): number {
  return new Date(`${date}T00:00:00Z`).getUTCDay();
}

export function minutesOf(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

export function ageFrom(dateOfBirth: string | null | undefined, today: string = istDate()): number | null {
  if (!dateOfBirth) return null;
  const [y, m, d] = dateOfBirth.split("-").map(Number);
  const [ty, tm, td] = today.split("-").map(Number);
  let age = ty - y;
  if (tm < m || (tm === m && td < d)) age -= 1;
  return age;
}

const fmt = (opts: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat("en-IN", { timeZone: TIME_ZONE, ...opts });

/** "Tue, 14 Oct" */
export function formatDay(d: Date | string): string {
  const date = typeof d === "string" ? fromIst(d, "12:00") : d;
  return fmt({ weekday: "short", day: "numeric", month: "short" }).format(date);
}

/** "14 Oct 2026" */
export function formatDate(d: Date | string): string {
  const date = typeof d === "string" ? fromIst(d, "12:00") : d;
  return fmt({ day: "numeric", month: "short", year: "numeric" }).format(date);
}

/** "8:00 am" from "08:00" or a Date */
export function formatTime(t: string | Date): string {
  const date = typeof t === "string" ? fromIst("2026-01-01", t) : t;
  return fmt({ hour: "numeric", minute: "2-digit", hour12: true }).format(date).replace(" ", " ");
}

/** "Tue, 14 Oct · 8:00 am" */
export function formatDateTime(d: Date): string {
  return `${formatDay(d)} · ${formatTime(d)}`;
}

/** "in 2 days", "today", "yesterday", "3 days ago" relative to India today. */
export function relativeDay(date: string, today: string = istDate()): string {
  const diff = Math.round(
    (new Date(`${date}T00:00:00Z`).getTime() - new Date(`${today}T00:00:00Z`).getTime()) / 86_400_000
  );
  if (diff === 0) return "today";
  if (diff === 1) return "tomorrow";
  if (diff === -1) return "yesterday";
  if (diff > 1 && diff < 14) return `in ${diff} days`;
  if (diff < -1 && diff > -14) return `${-diff} days ago`;
  return formatDate(date);
}

/** "Good morning" etc. for India time. */
export function greeting(d: Date = new Date()): string {
  const h = Number(istTime(d).slice(0, 2));
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

/** Current time in ms. A function so render code reads "now" explicitly. */
export function nowMs(): number {
  return Date.now();
}
