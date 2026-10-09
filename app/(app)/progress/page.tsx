import type { Metadata } from "next";
import { eq } from "drizzle-orm";
import Link from "next/link";
import { Route, Sprout } from "lucide-react";
import { db } from "@/db";
import { medications, pcosProfiles } from "@/db/schema";
import { Illustration } from "@/components/brand/illustration";
import { BadgeGrid, HabitTally } from "@/components/game/badges";
import { GraceDayButton } from "@/components/game/grace-day-button";
import { LevelProgress } from "@/components/game/level-card";
import { PlanCard } from "@/components/game/plan-card";
import { ProgressChart } from "@/components/game/progress-chart";
import { QuestList } from "@/components/game/quest-list";
import { StreakFlame } from "@/components/game/streak-flame";
import { WeekStrip } from "@/components/game/week-strip";
import { MemberAvatar } from "@/components/health/member-avatar";
import { SafetyNote } from "@/components/health/safety-note";
import { MemberFilter } from "@/components/shell/member-filter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getContext } from "@/lib/context";
import { getVitals, latestByKind } from "@/lib/data";
import { addDays, ageFrom, formatDate, istDate } from "@/lib/dates";
import { getActivePlan, getGameSummaries, getScoreDays, getTodayHabits } from "@/lib/game-data";
import { STREAK_QUESTS } from "@/lib/gamification";
import { improvement, weeklyScores } from "@/lib/health-score";
import { firstName } from "@/lib/labels";
import { recommend } from "@/lib/recommendations";
import { bmi } from "@/lib/vitals";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Progress & rewards" };

export default async function ProgressPage({ searchParams }: { searchParams: Promise<{ member?: string }> }) {
  const { member: memberParam } = await searchParams;
  const ctx = await getContext();
  const member = ctx.visibleMembers.find((m) => m.id === memberParam) ?? ctx.visibleMembers.find((m) => m.id === ctx.self.id) ?? ctx.visibleMembers[0];
  const today = istDate();
  const [games, scoreDays, plan, habits, vit, meds, pcos] = await Promise.all([
    getGameSummaries(ctx.visibleMembers.map((m) => m.id)),
    getScoreDays(member.id, 60),
    getActivePlan(member.id),
    getTodayHabits(member.id),
    getVitals([member.id], 30),
    db.select({ id: medications.id }).from(medications).where(eq(medications.memberId, member.id)),
    db.select().from(pcosProfiles).where(eq(pcosProfiles.memberId, member.id)),
  ]);
  const game = games.get(member.id)!;
  const weeks = weeklyScores(scoreDays, plan?.startedOn ?? null);
  const improvements = plan
    ? { score: improvement(weeks, "score"), bpSys: improvement(weeks, "bpSys"), sugarFasting: improvement(weeks, "sugarFasting"), weight: improvement(weeks, "weight"), adherence: improvement(weeks, "adherence") }
    : {};
  const latest = latestByKind(vit).get(member.id);
  const suggestions = recommend({
    age: ageFrom(member.dateOfBirth),
    sex: member.sex,
    conditions: member.conditions,
    latest: {
      bpSys: latest?.get("bp") ? Number(latest.get("bp")!.value) : undefined,
      sugarFasting: vit.filter((v) => v.kind === "sugar" && v.context === "fasting").at(-1)?.value,
      bmi: bmi(latest?.get("weight") ? Number(latest.get("weight")!.value) : null, member.heightCm),
    },
    pcos: pcos[0]?.phenotype ?? null,
    hasMeds: meds.length > 0,
  });
  const board = ctx.visibleMembers
    .map((m) => ({ m, g: games.get(m.id)! }))
    .sort((a, b) => b.g.weeklyXp - a.g.weeklyXp);
  const first = firstName(member.name);
  const planDays = plan ? Math.round((new Date(`${today}T00:00:00Z`).getTime() - new Date(`${plan.startedOn}T00:00:00Z`).getTime()) / 86_400_000) : 0;
  const scoreImp = (improvements as { score?: { change: number } | null }).score;
  const toGo = Math.max(0, STREAK_QUESTS - game.today.done.length);
  const todayLine = game.todayActivity.grace
    ? "Rest day today. The streak is protected."
    : game.today.complete
      ? "Today counts towards the streak."
      : `${toGo} more quest${toGo === 1 ? "" : "s"} today to keep the streak.`;

  return (
    <div className="flex flex-col gap-8 animate-rise">
      <MemberFilter members={ctx.visibleMembers} active={member.id === ctx.self.id ? null : member.id} basePath="/progress" />

      {/* Summary */}
      <section aria-labelledby="progress-heading" className="grid gap-6 rounded-2xl border border-border bg-card p-5 sm:p-6 lg:grid-cols-[minmax(0,1fr)_18rem] lg:gap-10">
        <div className="flex flex-col gap-6">
          <div className="flex items-center gap-3.5">
            <MemberAvatar name={member.name} tone={member.avatarTone} size="lg" />
            <div className="min-w-0">
              <h1 id="progress-heading" className="font-heading text-2xl leading-tight font-semibold sm:text-[1.75rem]">
                {member.id === ctx.self.id ? "Your progress" : `${first}'s progress`}
              </h1>
              <p className="text-[0.9375rem] text-muted-foreground">{todayLine}</p>
            </div>
          </div>
          <div className="flex flex-wrap items-end gap-x-10 gap-y-5">
            <dl className="flex gap-8">
              <div>
                <dt className="text-sm text-muted-foreground">Streak</dt>
                <dd className="mt-0.5"><StreakFlame days={game.streak} size="lg" /></dd>
              </div>
              <div>
                <dt className="text-sm text-muted-foreground">Best</dt>
                <dd className="mt-0.5 font-heading text-2xl font-semibold tabular">
                  {game.bestStreak}
                  <span className="ml-1.5 font-sans text-sm font-normal text-muted-foreground">day{game.bestStreak === 1 ? "" : "s"}</span>
                </dd>
              </div>
              <div>
                <dt className="text-sm text-muted-foreground">This week</dt>
                <dd className="mt-0.5 font-heading text-2xl font-semibold tabular">
                  {game.weeklyXp}
                  <span className="ml-1.5 font-sans text-sm font-normal text-muted-foreground">XP</span>
                </dd>
              </div>
            </dl>
            <WeekStrip days={game.last7} />
          </div>
        </div>
        <div className="flex flex-col justify-center gap-3 rounded-xl bg-surface p-4 sm:p-5">
          <LevelProgress level={game.level} xp={game.xp} />
          <Link href={`/journeys${member.id === ctx.self.id ? "" : `?member=${member.id}`}`} className="inline-flex min-h-11 items-center gap-1.5 self-start rounded-lg text-[0.9375rem] font-medium text-brand hover:underline">
            <Route className="size-4" aria-hidden="true" /> See the whole journey
          </Link>
        </div>
      </section>

      {/* Quests */}
      <Card>
        <CardHeader className="gap-3 sm:grid-cols-[1fr_auto]">
          <div className="space-y-1">
            <CardTitle className="font-heading text-xl font-semibold">Today&apos;s quests</CardTitle>
            <CardDescription>
              {game.today.done.length} of {game.today.available.length} done · finish {STREAK_QUESTS} to keep the streak growing
            </CardDescription>
          </div>
          <GraceDayButton memberId={member.id} taken={game.todayActivity.grace ?? false} />
        </CardHeader>
        <CardContent>
          <QuestList
            member={{ id: member.id, name: member.name }}
            done={game.today.done}
            available={game.today.available.map((q) => q.key)}
            habits={habits}
            doses={{ taken: game.todayActivity.dosesTaken, due: game.todayActivity.dosesDue }}
          />
        </CardContent>
      </Card>

      {/* Improvement chart */}
      <Card>
        <CardHeader>
          <CardTitle className="font-heading text-xl font-semibold">Is it working?</CardTitle>
          <CardDescription>
            {plan
              ? scoreImp && scoreImp.change > 0
                ? `${first}'s health score is up ${scoreImp.change} points since starting the plan on ${formatDate(plan.startedOn)}.`
                : `Week-by-week since the plan started on ${formatDate(plan.startedOn)}.`
              : "Start a personalized plan below to see before-and-after progress."}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <ProgressChart weeks={weeks} planLabel={plan ? "Plan started" : null} improvements={improvements} />
          <SafetyNote>The health score mixes medicines taken (40%), readings in the usual range (35%) and daily habits (25%). It tracks habits, not illness. Not a diagnosis. Consult a doctor.</SafetyNote>
        </CardContent>
      </Card>

      {/* Plan */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 font-heading text-xl font-semibold"><Sprout className="size-5 text-primary" aria-hidden="true" /> Personalized plan</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_15rem] lg:items-center">
          <PlanCard memberId={member.id} firstName={first} plan={plan ? { startedOn: plan.startedOn, items: plan.items, days: planDays } : null} suggestions={suggestions} />
          <Illustration name="physio" className="hidden transition-transform duration-300 ease-out-soft hover:-translate-y-1.5 hover:scale-[1.04] lg:block" />
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <Card>
          <CardHeader>
            <CardTitle className="font-heading text-xl font-semibold">Badges</CardTitle>
            <CardDescription>{game.badges.filter((b) => b.earned).length} of {game.badges.length} earned</CardDescription>
          </CardHeader>
          <CardContent>
            <BadgeGrid badges={game.badges} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="font-heading text-xl font-semibold">This week in the family</CardTitle>
            <CardDescription>XP earned over the last 7 days</CardDescription>
          </CardHeader>
          <CardContent>
            <ol className="flex flex-col">
              {board.map(({ m, g }, i) => (
                <li key={m.id} className={cn("-mx-2 flex items-center gap-3 rounded-xl px-2 py-2.5", m.id === member.id && "bg-brand-soft")}>
                  <span className="w-5 shrink-0 text-center text-sm font-medium text-muted-foreground tabular">
                    {i + 1}
                    <span className="sr-only">. Rank {i + 1}</span>
                  </span>
                  <MemberAvatar name={m.name} tone={m.avatarTone} size="sm" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[0.9375rem] font-medium">{m.name.split(" ")[0]}</span>
                    <span className="block text-sm text-muted-foreground">{g.level.name} · {g.streak}-day streak</span>
                  </span>
                  <span className="font-heading text-lg font-semibold tabular">{g.weeklyXp}<span className="ml-1 font-sans text-sm font-normal text-muted-foreground">XP</span></span>
                </li>
              ))}
            </ol>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="font-heading text-xl font-semibold">Last 90 days</CardTitle>
          <CardDescription>Days each goal was met since {formatDate(addDays(today, -89))}.</CardDescription>
        </CardHeader>
        <CardContent>
          <HabitTally tally={game.tally} />
        </CardContent>
      </Card>
    </div>
  );
}
