import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  CalendarDays,
  CalendarPlus,
  CircleCheck,
  FileScan,
  MapPin,
  Pill,
  Siren,
  Stethoscope,
  UserPlus,
  Video,
} from "lucide-react";
import { AlertList } from "@/components/health/alert-list";
import { DoseList } from "@/components/health/dose-list";
import { EmptyState } from "@/components/health/empty-state";
import { MemberAvatar } from "@/components/health/member-avatar";
import { MemberCard } from "@/components/health/member-card";
import { Fruit, FruitScatter, type FruitKind } from "@/components/fruits/fruit";
import { LevelProgress } from "@/components/game/level-card";
import { QuestList } from "@/components/game/quest-list";
import { StreakFlame } from "@/components/game/streak-flame";
import { RoleGate } from "@/components/health/role-gate";
import { SafetyNote } from "@/components/health/safety-note";
import { VitalDialog } from "@/components/health/vital-dialog";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getContext } from "@/lib/context";
import { getDashboard } from "@/lib/data";
import { getGameSummaries, getTodayHabits } from "@/lib/game-data";
import { STREAK_QUESTS } from "@/lib/gamification";
import { formatDay, formatTime, greeting, istDate } from "@/lib/dates";
import { firstName } from "@/lib/labels";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Family dashboard" };

export default async function DashboardPage() {
  const ctx = await getContext();
  const [data, games, habits] = await Promise.all([getDashboard(ctx), getGameSummaries([ctx.self.id]), getTodayHabits(ctx.self.id)]);
  const game = games.get(ctx.self.id)!;
  const members = new Map(ctx.visibleMembers.map((m) => [m.id, { name: m.name, tone: m.avatarTone }]));
  const taken = data.todayDoses.filter((d) => d.state === "taken").length;
  const attention = data.alerts.filter((a) => a.severity !== "info").length;
  const today = istDate();

  const summary =
    attention > 0
      ? `${attention} thing${attention > 1 ? "s" : ""} need${attention > 1 ? "" : "s"} your attention today.`
      : "Everyone is on track today.";

  return (
    <div className="flex flex-col gap-8 animate-rise">
      <section className="relative overflow-hidden rounded-3xl bg-brand text-brand-foreground shadow-brand">
        <div aria-hidden="true" className="absolute -top-24 -right-20 size-80 rounded-full bg-brand-foreground/10" />
        <div aria-hidden="true" className="absolute -bottom-32 left-1/4 size-72 rounded-full bg-brand-foreground/5" />
        <FruitScatter className="hidden opacity-95 md:block" />
        <div className="relative grid gap-6 p-6 sm:p-8 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)] lg:items-center">
          <div className="flex flex-col gap-4">
            <p className="text-sm font-semibold opacity-85">{formatDay(data.now.instant)}</p>
            <h1 className="font-heading text-[2rem] leading-[1.1] font-extrabold text-inherit sm:text-[2.5rem]">
              {greeting()}, {firstName(ctx.user.name)}
            </h1>
            <p className="max-w-xl text-base opacity-90">{summary}</p>
            <div className="flex flex-wrap items-center gap-3">
              <VitalDialog members={ctx.visibleMembers.map((m) => ({ id: m.id, name: m.name }))} defaultMemberId={ctx.self.id} />
              <Link href="/progress" className={cn(buttonVariants({ variant: "outline" }), "border-brand-foreground/30 bg-brand-foreground/10 text-brand-foreground hover:bg-brand-foreground/20")}>
                Today&apos;s quests <ArrowRight aria-hidden="true" />
              </Link>
            </div>
          </div>
          <div className="flex flex-col gap-4 rounded-2xl bg-brand-foreground/10 p-5 backdrop-blur-sm">
            <div className="flex items-center justify-between gap-3">
              <StreakFlame days={game.streak} onDark />
              <span className="rounded-full bg-brand-foreground/15 px-3 py-1 text-sm font-semibold tabular">
                {game.today.done.length}/{game.today.available.length} quests
              </span>
            </div>
            <LevelProgress level={game.level} xp={game.xp} onDark />
            <p className="text-sm opacity-85">
              {game.today.complete ? "Streak secured for today. Keep going for bonus XP!" : `Finish ${Math.max(0, STREAK_QUESTS - game.today.done.length)} more quest${STREAK_QUESTS - game.today.done.length === 1 ? "" : "s"} to keep your streak.`}
            </p>
          </div>
        </div>
      </section>

      <Card>
        <CardHeader>
          <CardTitle className="font-heading text-xl font-bold">Your quests today</CardTitle>
          <CardDescription>Tap + as you go. Every quest adds a fruit to your basket.</CardDescription>
          <CardAction>
            <Link href="/progress" className={buttonVariants({ variant: "ghost", size: "sm" })}>
              Rewards <ArrowRight aria-hidden="true" />
            </Link>
          </CardAction>
        </CardHeader>
        <CardContent>
          <QuestList
            member={{ id: ctx.self.id, name: ctx.self.name }}
            done={game.today.done}
            available={game.today.available.map((q) => q.key)}
            habits={habits}
            doses={{ taken: game.todayActivity.dosesTaken, due: game.todayActivity.dosesDue }}
          />
        </CardContent>
      </Card>

      {data.alerts.length > 0 && (
        <Card className="overflow-hidden">
          <CardHeader className="pb-1">
            <CardTitle>Needs attention</CardTitle>
            <CardDescription>Missed doses, unusual readings, refills and medicine clashes.</CardDescription>
          </CardHeader>
          <div className="mt-3 border-t border-border">
            <AlertList alerts={data.alerts} limit={5} />
          </div>
          <div className="border-t border-border px-5 py-3 sm:px-6">
            <SafetyNote />
          </div>
        </Card>
      )}

      <section aria-labelledby="family-heading" className="flex flex-col gap-4">
        <div className="flex items-end justify-between gap-3">
          <div>
            <h2 id="family-heading" className="text-xl font-semibold">
              Family members
            </h2>
            <p className="text-[0.9375rem] text-muted-foreground">
              {ctx.visibleMembers.length} {ctx.visibleMembers.length === 1 ? "profile" : "profiles"} you can see
            </p>
          </div>
          <RoleGate action="member.add" mode="hide">
            <Link href="/settings?tab=members" className={buttonVariants({ variant: "outline", size: "sm" })}>
              <UserPlus aria-hidden="true" /> Add member
            </Link>
          </RoleGate>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {ctx.visibleMembers.map((m) => {
            const mine = data.todayDoses.filter((d) => d.memberId === m.id);
            return (
              <MemberCard
                key={m.id}
                member={m}
                isMe={m.id === ctx.self.id}
                latest={data.latest.get(m.id)}
                doses={{ taken: mine.filter((d) => d.state === "taken").length, total: mine.length }}
                alertCount={data.alerts.filter((a) => a.memberId === m.id && a.severity !== "info").length}
              />
            );
          })}
        </div>
      </section>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <Card>
          <CardHeader>
            <CardTitle>Today&apos;s medicines</CardTitle>
            <CardDescription>
              {data.todayDoses.length ? `${taken} of ${data.todayDoses.length} doses taken · tap the circle to mark a dose` : "Nothing scheduled today"}
            </CardDescription>
            <CardAction>
              <Link href="/medications" className={buttonVariants({ variant: "ghost", size: "sm" })}>
                All medicines <ArrowRight aria-hidden="true" />
              </Link>
            </CardAction>
          </CardHeader>
          <CardContent>
            {data.todayDoses.length === 0 ? (
              <EmptyState
                compact
                icon={Pill}
                title="No medicines today"
                description="Add a medicine and Pulse will remind the family when each dose is due."
                action={
                  <RoleGate action="meds.manage" mode="hide">
                    <Link href="/medications/new" className={buttonVariants()}>
                      Add a medicine
                    </Link>
                  </RoleGate>
                }
              />
            ) : taken === data.todayDoses.length ? (
              <div className="mb-5 flex items-center gap-3 rounded-lg bg-success-soft px-4 py-3 text-success">
                <CircleCheck className="size-5 shrink-0" aria-hidden="true" />
                <p className="text-base font-medium">All of today&apos;s doses are done. Nice work.</p>
              </div>
            ) : null}
            {data.todayDoses.length > 0 && <DoseList doses={data.todayDoses} members={members} showMember={ctx.visibleMembers.length > 1} />}
          </CardContent>
        </Card>

        <div className="flex flex-col gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Upcoming appointments</CardTitle>
              <CardDescription>Next three weeks</CardDescription>
              <CardAction>
                <Link href="/appointments" className={buttonVariants({ variant: "ghost", size: "sm" })}>
                  View all <ArrowRight aria-hidden="true" />
                </Link>
              </CardAction>
            </CardHeader>
            <CardContent>
              {data.upcoming.length === 0 ? (
                <EmptyState
                  compact
                  icon={CalendarDays}
                  title="Nothing booked"
                  description="Book a clinic visit or a video consult."
                  action={
                    <RoleGate action="appointments.manage" mode="hide">
                      <Link href="/appointments/book" className={buttonVariants({ variant: "outline" })}>
                        Book a doctor
                      </Link>
                    </RoleGate>
                  }
                />
              ) : (
                <ul className="flex flex-col gap-3">
                  {data.upcoming.slice(0, 4).map((a) => {
                    const m = members.get(a.memberId);
                    const day = formatDay(a.startsAt);
                    const isToday = istDate(a.startsAt) === today;
                    return (
                      <li key={a.id} className="flex gap-3 rounded-lg border border-border p-3.5">
                        <div className={cn("flex w-14 shrink-0 flex-col items-center justify-center rounded-lg py-1.5 text-center", isToday ? "bg-primary text-primary-foreground" : "bg-surface")}>
                          <span className="text-xs font-medium uppercase">{day.split(",")[0]}</span>
                          <span className="text-xl leading-tight font-semibold tabular">{day.split(" ")[1]}</span>
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-base font-semibold">{a.doctorName}</p>
                          <p className="truncate text-sm text-muted-foreground">{a.reason ?? a.specialty}</p>
                          <p className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
                            {a.mode === "video" ? <Video className="size-4" aria-hidden="true" /> : <MapPin className="size-4" aria-hidden="true" />}
                            <span className="tabular">{formatTime(a.startsAt)}</span>
                            <span aria-hidden="true">·</span>
                            {m && (
                              <span className="inline-flex items-center gap-1 truncate">
                                <MemberAvatar name={m.name} tone={m.tone} size="sm" className="size-5 text-[0.625rem]" />
                                {firstName(m.name)}
                              </span>
                            )}
                          </p>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Quick actions</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-2.5">
              {[
                { href: "/triage", label: "Check symptoms", hint: "AI with safety rules", icon: Stethoscope, fruit: "apple" as FruitKind, tint: "bg-fruit-berry-soft" },
                { href: "/emergency", label: "Emergency card", hint: "Readable in 3 sec", icon: Siren, fruit: "strawberry" as FruitKind, tint: "bg-fruit-orange-soft" },
                { href: "/records/scan", label: "Scan prescription", hint: "Add meds from a photo", icon: FileScan, fruit: "lemon" as FruitKind, tint: "bg-fruit-lemon-soft" },
                { href: "/appointments/book", label: "Book a doctor", hint: "Clinic or video", icon: CalendarPlus, fruit: "grapes" as FruitKind, tint: "bg-fruit-grape-soft" },
              ].map((q) => (
                <Link
                  key={q.href}
                  href={q.href}
                  className={cn("group relative flex min-h-28 flex-col justify-between gap-3 overflow-hidden rounded-2xl p-3.5 transition-transform duration-150 hover:-translate-y-0.5", q.tint)}
                >
                  <Fruit kind={q.fruit} className="absolute -right-2 -bottom-2 size-14 opacity-90 transition-transform duration-200 group-hover:scale-110" />
                  <q.icon className="size-5 text-foreground" aria-hidden="true" />
                  <span className="relative">
                    <span className="block text-[0.9375rem] font-semibold leading-snug">{q.label}</span>
                    <span className="block text-sm text-muted-foreground">{q.hint}</span>
                  </span>
                </Link>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
