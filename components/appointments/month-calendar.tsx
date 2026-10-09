import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { Appointment } from "@/db/schema";
import { addDays, formatTime, istDate, weekday } from "@/lib/dates";
import { cn } from "@/lib/utils";

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

/** Month grid; each day links to its list of appointments below. Weeks start on Monday. */
export function MonthCalendar({
  month,
  selected,
  appointments,
  members,
  baseQuery,
}: {
  month: string; // YYYY-MM
  selected: string | null;
  appointments: Appointment[];
  members: Map<string, { name: string; tone: number }>;
  baseQuery: string;
}) {
  const first = `${month}-01`;
  const lead = (weekday(first) + 6) % 7;
  const start = addDays(first, -lead);
  const days = Array.from({ length: 42 }, (_, i) => addDays(start, i));
  const today = istDate();
  const byDay = new Map<string, Appointment[]>();
  for (const a of appointments) {
    const d = istDate(a.startsAt);
    byDay.set(d, [...(byDay.get(d) ?? []), a]);
  }
  const [y, m] = month.split("-").map(Number);
  const prev = m === 1 ? `${y - 1}-12` : `${y}-${String(m - 1).padStart(2, "0")}`;
  const next = m === 12 ? `${y + 1}-01` : `${y}-${String(m + 1).padStart(2, "0")}`;
  const title = new Intl.DateTimeFormat("en-IN", { month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(`${first}T00:00:00Z`));
  const q = (extra: string) => `/appointments?view=calendar${baseQuery}${extra}`;

  return (
    <div className="rounded-xl border border-border bg-card">
      <div className="flex items-center justify-between border-b border-border px-4 py-3 sm:px-5">
        <h2 className="text-lg font-semibold" aria-live="polite">{title}</h2>
        <div className="flex items-center gap-1">
          <Link href={q(`&month=${prev}`)} aria-label="Previous month" className="flex size-11 items-center justify-center rounded-lg hover:bg-muted"><ChevronLeft className="size-5" aria-hidden="true" /></Link>
          <Link href={q(`&month=${today.slice(0, 7)}`)} className="flex h-11 items-center rounded-lg px-3 text-[0.9375rem] font-medium hover:bg-muted">Today</Link>
          <Link href={q(`&month=${next}`)} aria-label="Next month" className="flex size-11 items-center justify-center rounded-lg hover:bg-muted"><ChevronRight className="size-5" aria-hidden="true" /></Link>
        </div>
      </div>
      <div role="grid" aria-label={title} className="grid grid-cols-7">
        {WEEKDAYS.map((d) => (
          <div key={d} role="columnheader" className="border-b border-border py-2 text-center text-sm font-medium text-muted-foreground">
            <span className="sm:hidden">{d[0]}</span><span className="hidden sm:inline">{d}</span>
          </div>
        ))}
        {days.map((d, i) => {
          const inMonth = d.startsWith(month);
          const list = byDay.get(d) ?? [];
          const isToday = d === today;
          const isSel = d === selected;
          return (
            <Link
              key={d}
              role="gridcell"
              href={q(`&month=${month}&day=${d}`)}
              aria-label={`${d}${list.length ? `, ${list.length} appointment${list.length > 1 ? "s" : ""}` : ""}`}
              aria-selected={isSel}
              className={cn(
                "flex min-h-16 flex-col gap-1 border-border p-1.5 transition-colors hover:bg-muted/70 sm:min-h-24 sm:p-2",
                i % 7 !== 6 && "border-r",
                i < 35 && "border-b",
                !inMonth && "bg-surface/60 text-muted-foreground",
                isSel && "bg-accent/60"
              )}
            >
              <span className={cn("flex size-7 items-center justify-center rounded-full text-sm font-medium tabular", isToday && "bg-primary text-primary-foreground")}>{Number(d.slice(8))}</span>
              <span className="flex flex-col gap-1">
                {list.slice(0, 2).map((a) => (
                  <span key={a.id} className={cn("hidden truncate rounded px-1.5 py-0.5 text-xs font-medium sm:block", a.status === "cancelled" ? "bg-muted text-muted-foreground line-through" : "bg-accent text-accent-foreground")}>
                    {formatTime(a.startsAt)} {members.get(a.memberId)?.name.split(" ")[0]}
                  </span>
                ))}
                {list.length > 0 && <span className="size-2 rounded-full bg-primary sm:hidden" aria-hidden="true" />}
                {list.length > 2 && <span className="hidden text-xs text-muted-foreground sm:block">+{list.length - 2} more</span>}
              </span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
