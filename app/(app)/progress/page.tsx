import type { Metadata } from "next";
import { eq } from "drizzle-orm";
import { Crown, Medal, Sprout, Trophy } from "lucide-react";
import { db } from "@/db";
import { medications, pcosProfiles } from "@/db/schema";
import { FruitBasket, BadgeGrid } from "@/components/game/badges";
import { GraceDayButton } from "@/components/game/grace-day-button";
import { LevelProgress } from "@/components/game/level-card";
import { PlanCard } from "@/components/game/plan-card";
import { ProgressChart } from "@/components/game/progress-chart";
import { QuestList } from "@/components/game/quest-list";
import { StreakFlame } from "@/components/game/streak-flame";
import { WeekStrip } from "@/components/game/week-strip";
import { FruitScatter } from "@/components/fruits/fruit";
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

  return (
    <div className="flex flex-col gap-8 animate-rise">
      <MemberFilter members={ctx.visibleMembers} active={member.id === ctx.self.id ? null : member.id} basePath="/progress" />

      {/* Hero */}
      <section className="relative overflow-hidden rounded-3xl bg-brand p-6 text-brand-foreground shadow-brand sm:p-8">
        <div aria-hidden="true" className="absolute -top-24 -right-16 size-72 rounded-full bg-brand-foreground/10" />
        <div aria-hidden="true" className="absolute -bottom-28 left-1/3 size-64 rounded-full bg-brand-foreground/5" />
        <FruitScatter className="hidden opacity-90 sm:block" />
        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-col gap-5">
            <div className="flex items-center gap-3">
              <MemberAvatar name={member.name} tone={member.avatarTone} size="lg" className="ring-4 ring-brand-foreground/25" />
              <div>
                <p className="text-sm font-medium opacity-85">{member.id === ctx.self.id ? "Your garden" : `${first}'s garden`}</p>
                <h1 className="font-heading text-[1.75rem] leading-tight font-extrabold text-inherit sm:text-[2rem]">
                  {game.streak > 0 ? `${game.streak}-day streak, ${first}!` : `Let's grow, ${first}!`}
                </h1>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-x-8 gap-y-4">
              <StreakFlame days={game.streak} size="lg" onDark />
              <div className="text-sm">
                <p className="opacity-85">Best streak</p>
                <p className="font-heading text-xl font-extrabold">{game.bestStreak} days</p>
              </div>
              <div className="text-sm">
                <p className="opacity-85">This week</p>
                <p className="font-heading text-xl font-extrabold tabular">{game.weeklyXp} XP</p>
              </div>
            </div>
            <WeekStrip days={game.last7} onDark />
          </div>
          <div className="rounded-2xl bg-brand-foreground/10 p-4 backdrop-blur-sm lg:w-80">
            <LevelProgress level={game.level} xp={game.xp} onDark />
          </div>
        </div>
      </section>

      {/* Quests */}
      <Card>
        <CardHeader className="gap-3 sm:grid-cols-[1fr_auto]">
          <div className="space-y-1">
            <CardTitle className="font-heading text-xl font-bold">Today&apos;s quests</CardTitle>
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
          <CardTitle className="font-heading text-xl font-bold">Is it working?</CardTitle>
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
          <CardTitle className="flex items-center gap-2 font-heading text-xl font-bold"><Sprout className="size-5 text-primary" aria-hidden="true" /> Personalized plan</CardTitle>
        </CardHeader>
        <CardContent>
          <PlanCard memberId={member.id} firstName={first} plan={plan ? { startedOn: plan.startedOn, items: plan.items, days: planDays } : null} suggestions={suggestions} />
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 font-heading text-xl font-bold"><Trophy className="size-5 text-fruit-orange" aria-hidden="true" /> Badges</CardTitle>
            <CardDescription>{game.badges.filter((b) => b.earned).length} of {game.badges.length} earned</CardDescription>
          </CardHeader>
          <CardContent>
            <BadgeGrid badges={game.badges} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 font-heading text-xl font-bold"><Crown className="size-5 text-fruit-lemon" aria-hidden="true" /> Family leaderboard</CardTitle>
            <CardDescription>XP earned this week. Cheer each other on!</CardDescription>
          </CardHeader>
          <CardContent>
            <ol className="flex flex-col gap-2">
              {board.map(({ m, g }, i) => (
                <li key={m.id} className={cn("flex items-center gap-3 rounded-2xl p-3", m.id === member.id ? "bg-brand-soft" : "bg-surface")}>
                  <span className={cn("flex size-8 shrink-0 items-center justify-center rounded-full font-heading text-sm font-extrabold", i === 0 ? "bg-fruit-lemon text-fruit-ink" : i === 1 ? "bg-muted" : i === 2 ? "bg-fruit-orange-soft" : "bg-card")}>
                    {i < 3 ? <Medal className="size-4" aria-hidden="true" /> : i + 1}
                    <span className="sr-only">Rank {i + 1}</span>
                  </span>
                  <MemberAvatar name={m.name} tone={m.avatarTone} size="sm" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[0.9375rem] font-semibold">{m.name.split(" ")[0]}</span>
                    <span className="text-xs text-muted-foreground">{g.level.name} · {g.streak}-day streak</span>
                  </span>
                  <span className="font-heading text-lg font-extrabold tabular">{g.weeklyXp}<span className="ml-1 text-xs font-medium text-muted-foreground">XP</span></span>
                </li>
              ))}
            </ol>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="font-heading text-xl font-bold">Fruit basket</CardTitle>
          <CardDescription>Every quest you finish adds a fruit. Last 90 days since {formatDate(addDays(today, -89))}.</CardDescription>
        </CardHeader>
        <CardContent>
          <FruitBasket basket={game.basket} />
        </CardContent>
      </Card>
    </div>
  );
}
