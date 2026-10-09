import { minutesOf, weekday } from "@/lib/dates";

export type Slot = { time: string; available: boolean };

const hhmm = (m: number) => `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;

/** Bookable slots for one doctor on one India date. Past times and booked times are unavailable. */
export function slotsFor(
  hours: Record<string, [string, string] | null>,
  slotMinutes: number,
  date: string,
  booked: string[],
  now: { date: string; time: string }
): Slot[] {
  const window = hours[String(weekday(date))];
  if (!window || date < now.date) return [];
  const [start, end] = window.map(minutesOf);
  const taken = new Set(booked);
  const out: Slot[] = [];
  for (let m = start; m + slotMinutes <= end; m += slotMinutes) {
    const time = hhmm(m);
    const past = date === now.date && m <= minutesOf(now.time) + 30; // 30 min notice
    out.push({ time, available: !past && !taken.has(time) });
  }
  return out;
}

export function isBookable(
  hours: Record<string, [string, string] | null>,
  slotMinutes: number,
  date: string,
  time: string,
  booked: string[],
  now: { date: string; time: string }
): boolean {
  return slotsFor(hours, slotMinutes, date, booked, now).some((s) => s.time === time && s.available);
}
