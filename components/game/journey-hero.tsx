import Link from "next/link";
import { ArrowRight, Flag, Trophy } from "lucide-react";
import { CountUp } from "@/components/game/count-up";
import { JOURNEY_ICON } from "@/components/game/journey-icons";
import { MemberAvatar } from "@/components/health/member-avatar";
import { buttonVariants } from "@/components/ui/button";
import { formatDay } from "@/lib/dates";
import { firstName } from "@/lib/labels";
import type { closestWin, Win } from "@/lib/journeys";
import { cn } from "@/lib/utils";

/** The top of Journeys: how far someone has come, counted up, and the nearest win with one way to go and get it. */
export function JourneyHero({
  member,
  isSelf,
  days,
  wins,
  daysShowingUp,
  xp,
  closest,
  memberQuery,
}: {
  member: { name: string; avatarTone: number };
  isSelf: boolean;
  days: number;
  wins: number;
  daysShowingUp: number;
  xp: number;
  closest: ReturnType<typeof closestWin>;
  memberQuery: string;
}) {
  const first = firstName(member.name);
  const NextIcon = closest ? JOURNEY_ICON[closest.journey.key] : Flag;
  return (
    <section aria-labelledby="journeys-heading" className="relative isolate overflow-hidden rounded-3xl bg-brand p-5 text-brand-foreground shadow-brand sm:p-8">
      <svg viewBox="0 0 400 200" preserveAspectRatio="none" className="absolute inset-0 -z-10 size-full opacity-25" aria-hidden="true">
        <path className="journey-trail" d="M-10,170 C60,170 70,90 140,100 S230,180 290,120 S360,30 420,40" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
      </svg>
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-center lg:gap-10">
        <div className="flex flex-col gap-6">
          <div className="flex items-center gap-3.5">
            <MemberAvatar name={member.name} tone={member.avatarTone} size="lg" />
            <div className="min-w-0">
              <p className="text-sm text-brand-foreground/80">
                {isSelf ? "Your journeys" : `${first}'s journeys`} · last {days} days
              </p>
              <h1 id="journeys-heading" className="font-heading text-[1.75rem] leading-tight font-extrabold tracking-[-0.015em] text-brand-foreground sm:text-4xl">
                {wins ? `${wins} milestone${wins === 1 ? "" : "s"} and counting` : "Every road starts with one step"}
              </h1>
            </div>
          </div>
          <p className="max-w-xl text-base text-brand-foreground/85">
            {wins
              ? `${isSelf ? "You've" : `${first} has`} shown up on ${daysShowingUp} of the last ${days} days. Each milestone here was earned by something actually logged, and each one is dated.`
              : "Finish one quest today and the first milestone lights up. Small steps add up faster than they feel."}
          </p>
          <dl className="flex flex-wrap gap-x-10 gap-y-4">
            {[
              { label: "Milestones", value: wins, delay: 150 },
              { label: "Days showing up", value: daysShowingUp, delay: 250 },
              { label: "XP earned", value: xp, delay: 350 },
            ].map((s) => (
              <div key={s.label}>
                <dt className="text-sm text-brand-foreground/80">{s.label}</dt>
                <dd className="font-heading text-3xl font-extrabold tabular sm:text-4xl">
                  <CountUp value={s.value} delay={s.delay} />
                </dd>
              </div>
            ))}
          </dl>
        </div>

        <div className="reward-rise rounded-2xl bg-card p-5 text-card-foreground shadow-pop" style={{ animationDelay: "300ms" }}>
          {closest ? (
            <>
              <p className="text-sm font-medium text-muted-foreground">Closest win</p>
              <div className="mt-3 flex items-center gap-3">
                <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-brand">
                  <NextIcon className="size-5" aria-hidden="true" />
                </span>
                <p className="min-w-0 leading-snug">
                  <span className="block font-heading text-xl font-bold">{closest.journey.toGo}</span>
                  <span className="block text-[0.9375rem] text-muted-foreground">to reach {closest.next.label}</span>
                </p>
              </div>
              <Link href={`${closest.journey.key === "meds" ? "/medications" : "/progress"}${memberQuery}`} className={cn(buttonVariants(), "mt-4 w-full")}>
                Go get it <ArrowRight aria-hidden="true" />
              </Link>
            </>
          ) : (
            <div className="flex items-center gap-3">
              <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-brand">
                <Trophy className="size-5" aria-hidden="true" />
              </span>
              <p className="font-heading text-lg font-bold">Every road finished. Remarkable.</p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

const SHOWN_WINS = 6;

/** Every milestone reached, newest first, each with the day it happened. */
export function WinList({ wins }: { wins: Win[] }) {
  const row = (w: Win, i: number) => {
    const Icon = JOURNEY_ICON[w.journey];
    return (
      <li key={`${w.journey}-${w.label}`} className="reward-rise flex items-center gap-3.5 py-3" style={{ animationDelay: `${Math.min(i, 8) * 50}ms` }}>
        <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-brand-soft text-brand">
          <Icon className="size-5" aria-hidden="true" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-[0.9375rem] font-medium">{w.label}</span>
          <span className="block text-sm text-muted-foreground">{w.journey === "level" ? "New level" : `${w.title} road`}</span>
        </span>
        <span className="shrink-0 text-sm text-muted-foreground tabular">{formatDay(w.date)}</span>
      </li>
    );
  };
  return (
    <>
      <ul className="divide-y divide-border">{wins.slice(0, SHOWN_WINS).map(row)}</ul>
      {wins.length > SHOWN_WINS && (
        <details className="group">
          <summary className="mt-2 flex min-h-11 cursor-pointer list-none items-center gap-1.5 rounded-lg text-[0.9375rem] font-medium text-brand hover:underline [&::-webkit-details-marker]:hidden">
            <span className="group-open:hidden">Show all {wins.length} wins</span>
            <span className="hidden group-open:inline">Show fewer</span>
          </summary>
          <ul className="divide-y divide-border border-t border-border">{wins.slice(SHOWN_WINS).map(row)}</ul>
        </details>
      )}
    </>
  );
}
