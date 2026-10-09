import type { Metadata } from "next";
import Link from "next/link";
import { and, desc, eq, gte, inArray } from "drizzle-orm";
import { CalendarHeart, Flower2, HeartHandshake, Pill, Settings2, TriangleAlert } from "lucide-react";
import { db } from "@/db";
import { cycleLogs, foodLogs, graceDays, pcosProfiles, protocolLogs, symptomLogs } from "@/db/schema";
import { Fruit } from "@/components/fruits/fruit";
import { GraceDayButton } from "@/components/game/grace-day-button";
import { EmptyState } from "@/components/health/empty-state";
import { RoleGate } from "@/components/health/role-gate";
import { SafetyNote } from "@/components/health/safety-note";
import { CycleChart, CycleForm, CycleHistory } from "@/components/pcos/cycle-panel";
import { MealLogger } from "@/components/pcos/meal-logger";
import { PcosSetup } from "@/components/pcos/pcos-setup";
import { ProtocolChecklist } from "@/components/pcos/protocol-checklist";
import { SymptomLogger } from "@/components/pcos/symptom-logger";
import { MemberFilter } from "@/components/shell/member-filter";
import { TabLinks } from "@/components/shell/tab-links";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { allowed, getContext } from "@/lib/context";
import { addDays, formatDate, istDate } from "@/lib/dates";
import { firstName } from "@/lib/labels";
import { cycleFlags, cycleStats, dailyProtocol, PCOS_FOODS, PCOS_SYMPTOMS, PHENOTYPE_INFO, type OnboardingAnswers } from "@/lib/pcos";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "PCOS care" };

const TABS = [
  { key: "today", label: "Today" },
  { key: "cycle", label: "Cycle" },
  { key: "symptoms", label: "Symptoms" },
  { key: "food", label: "Food" },
  { key: "setup", label: "Prescription & quiz" },
] as const;

export default async function PcosPage({ searchParams }: { searchParams: Promise<{ member?: string; tab?: string }> }) {
  const sp = await searchParams;
  const ctx = await getContext();
  const profiles = await db.select().from(pcosProfiles).where(inArray(pcosProfiles.memberId, ctx.visibleMembers.length ? ctx.visibleMembers.map((m) => m.id) : ["00000000-0000-0000-0000-000000000000"]));
  const eligible = ctx.visibleMembers.filter((m) => m.sex === "female" || profiles.some((p) => p.memberId === m.id) || m.conditions.some((c) => /pcos|pcod/i.test(c.name)));
  if (!eligible.length) {
    return (
      <EmptyState icon={Flower2} title="No one to set up PCOS care for yet" description="PCOS care is for women and girls in the family. Add a member or switch role to see it." action={<Link href="/dashboard" className={buttonVariants()}>Back home</Link>} />
    );
  }
  const member = eligible.find((m) => m.id === sp.member) ?? eligible.find((m) => profiles.some((p) => p.memberId === m.id)) ?? eligible[0];
  const profile = profiles.find((p) => p.memberId === member.id) ?? null;
  const first = firstName(member.name);
  const tab = TABS.some((t) => t.key === sp.tab) ? sp.tab! : profile ? "today" : "setup";
  const today = istDate();
  const base = `/pcos?member=${member.id}`;

  const header = (
    <section className="relative overflow-hidden rounded-3xl bg-fruit-grape-soft p-6 sm:p-8">
      <div aria-hidden="true" className="pointer-events-none absolute -right-4 -bottom-6 flex gap-1 opacity-90">
        <Fruit kind="strawberry" className="size-16 rotate-12" />
        <Fruit kind="pear" className="size-20 -rotate-6" />
        <Fruit kind="cherry" className="size-14" />
      </div>
      <div className="relative max-w-2xl space-y-2">
        <p className="flex items-center gap-2 text-sm font-semibold text-accent-foreground"><Flower2 className="size-4" aria-hidden="true" /> PCOS care companion</p>
        <h1 className="font-heading text-[1.75rem] leading-tight font-extrabold sm:text-[2.25rem]">{profile ? `${first}'s rhythm, gently tracked` : `Set up PCOS care for ${first}`}</h1>
        <p className="text-base text-muted-foreground">
          {profile ? `${PHENOTYPE_INFO[profile.phenotype].title} pattern · following Dr. ${profile.doctorName?.replace(/^Dr\.?\s*/i, "")}'s plan` : "Works alongside the doctor's prescription with a small daily plan, cycle tracking without 28-day pressure, and symptom and food logs."}
        </p>
      </div>
    </section>
  );

  return (
    <div className="flex flex-col gap-6 animate-rise">
      {eligible.length > 1 && <MemberFilter members={eligible} active={member.id} basePath="/pcos" />}
      {header}
      <TabLinks label="PCOS sections" active={tab} tabs={TABS.map((t) => ({ key: t.key, label: t.label, href: `${base}&tab=${t.key}` }))} />
      {tab === "setup" ? (
        allowed(ctx, "member.edit", member.id) ? (
          <PcosSetup memberId={member.id} initial={profile ? { doctorName: profile.doctorName, diagnosedOn: profile.diagnosedOn, prescribed: profile.prescribed, supplements: profile.supplements, answers: profile.answers as Partial<OnboardingAnswers> } : undefined} />
        ) : (
          <EmptyState icon={Settings2} title="Ask your family admin to set this up" description="Your role can view and log, but not change the prescription or quiz." />
        )
      ) : !profile ? (
        <EmptyState icon={Flower2} title="Start with the doctor's prescription" description="Two minutes: add what the doctor prescribed, answer 8 questions, and get a daily plan." action={<RoleGate action="member.edit" memberId={member.id}><Link href={`${base}&tab=setup`} className={buttonVariants({ variant: "brand" })}>Set up PCOS care</Link></RoleGate>} />
      ) : tab === "today" ? (
        <TodayTab memberId={member.id} profile={profile} today={today} />
      ) : tab === "cycle" ? (
        <CycleTab memberId={member.id} today={today} />
      ) : tab === "symptoms" ? (
        <SymptomsTab memberId={member.id} today={today} />
      ) : (
        <FoodTab memberId={member.id} today={today} />
      )}
      <p className="flex items-start gap-2 text-sm text-muted-foreground">
        <HeartHandshake className="mt-0.5 size-4 shrink-0" aria-hidden="true" /> Need support? iCall 9152987821 or Vandrevala Foundation 1860-2662-345. For emergencies call 108.
      </p>
    </div>
  );
}

async function TodayTab({ memberId, profile, today }: { memberId: string; profile: typeof pcosProfiles.$inferSelect; today: string }) {
  const [done, grace, recent] = await Promise.all([
    db.select().from(protocolLogs).where(and(eq(protocolLogs.memberId, memberId), eq(protocolLogs.date, today))),
    db.select().from(graceDays).where(and(eq(graceDays.memberId, memberId), eq(graceDays.date, today))),
    db.select().from(protocolLogs).where(and(eq(protocolLogs.memberId, memberId), gte(protocolLogs.date, addDays(today, -6)))),
  ]);
  const actions = dailyProtocol(profile.phenotype);
  const perDay = Array.from({ length: 7 }, (_, i) => addDays(today, i - 6)).map((d) => ({ d, n: recent.filter((r) => r.date === d).length }));
  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
      <Card>
        <CardHeader className="gap-3 sm:grid-cols-[1fr_auto]">
          <div className="space-y-1">
            <CardTitle className="font-heading text-xl font-bold">Today&apos;s gentle plan</CardTitle>
            <CardDescription>{done.length} of {actions.length} done · each one adds XP to your streak</CardDescription>
          </div>
          <GraceDayButton memberId={memberId} taken={grace.length > 0} />
        </CardHeader>
        <CardContent>
          <ProtocolChecklist memberId={memberId} actions={actions} done={done.map((d) => d.actionKey)} />
        </CardContent>
      </Card>
      <div className="flex flex-col gap-6">
        <Card>
          <CardHeader><CardTitle className="font-heading text-lg font-bold">{PHENOTYPE_INFO[profile.phenotype].title} pattern</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <p className="text-[0.9375rem]">{PHENOTYPE_INFO[profile.phenotype].summary}</p>
            <SafetyNote>A pattern from your answers to guide habits. Not a diagnosis. Discuss changes with your doctor.</SafetyNote>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2 font-heading text-lg font-bold"><Pill className="size-5 text-muted-foreground" aria-hidden="true" /> From the prescription</CardTitle></CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {[...profile.prescribed, ...profile.supplements].map((m) => (
                <li key={m.name} className="rounded-xl bg-surface px-3.5 py-2.5 text-[0.9375rem]"><span className="font-semibold">{m.name}</span> {m.dose}<span className="block text-sm text-muted-foreground">{m.frequency}</span></li>
              ))}
            </ul>
            <p className="mt-3 text-sm text-muted-foreground">Doses are tracked on the Medicines page with reminders.</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="font-heading text-lg font-bold">Last 7 days</CardTitle></CardHeader>
          <CardContent>
            <ol className="flex items-end justify-between gap-2" aria-label="Plan actions done each day">
              {perDay.map((p) => (
                <li key={p.d} className="flex flex-1 flex-col items-center gap-1.5">
                  <span className="flex h-20 w-full items-end overflow-hidden rounded-lg bg-muted">
                    <span className="w-full rounded-lg bg-fruit-grape" style={{ height: `${Math.min(100, (p.n / actions.length) * 100)}%` }} />
                  </span>
                  <span className="text-xs text-muted-foreground">{new Intl.DateTimeFormat("en-IN", { weekday: "narrow", timeZone: "UTC" }).format(new Date(`${p.d}T00:00:00Z`))}</span>
                  <span className="sr-only">{p.n} actions</span>
                </li>
              ))}
            </ol>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

async function CycleTab({ memberId, today }: { memberId: string; today: string }) {
  const rows = await db.select().from(cycleLogs).where(eq(cycleLogs.memberId, memberId)).orderBy(desc(cycleLogs.startDate)).limit(24);
  const starts = rows.map((r) => r.startDate);
  const stats = cycleStats(starts, today);
  const flags = cycleFlags(stats);
  const asc = [...rows].reverse();
  const chart = asc.slice(1).map((r, i) => ({ start: asc[i].startDate, length: Math.round((new Date(`${r.startDate}T00:00:00Z`).getTime() - new Date(`${asc[i].startDate}T00:00:00Z`).getTime()) / 86_400_000) }));
  const history = rows.map((r, i) => ({ id: r.id, startDate: r.startDate, endDate: r.endDate, flow: r.flow, length: i === 0 ? null : Math.round((new Date(`${rows[i - 1].startDate}T00:00:00Z`).getTime() - new Date(`${r.startDate}T00:00:00Z`).getTime()) / 86_400_000) }));
  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
      <div className="flex flex-col gap-6">
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2 font-heading text-xl font-bold"><CalendarHeart className="size-5 text-fruit-berry" aria-hidden="true" /> Your rhythm</CardTitle><CardDescription>No predictions, no &ldquo;late&rdquo; alarms. Just your own pattern to share with your doctor.</CardDescription></CardHeader>
          <CardContent className="flex flex-col gap-4">
            <dl className="grid grid-cols-3 gap-3">
              {[
                ["Average cycle", stats.average ? `${stats.average} days` : "—"],
                ["Range", stats.shortest ? `${stats.shortest}–${stats.longest} days` : "—"],
                ["Day of cycle", stats.daysSinceLast != null ? `Day ${stats.daysSinceLast + 1}` : "—"],
              ].map(([k, v]) => (
                <div key={k} className="rounded-2xl bg-surface p-3.5"><dt className="text-sm text-muted-foreground">{k}</dt><dd className="font-heading text-lg font-extrabold">{v}</dd></div>
              ))}
            </dl>
            <CycleChart cycles={chart} />
            {flags.map((f) => (
              <p key={f} className="flex gap-2 rounded-xl border border-warning-border bg-warning-soft px-3.5 py-3 text-[0.9375rem] text-warning"><TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden="true" /> {f}</p>
            ))}
            <SafetyNote />
          </CardContent>
        </Card>
        <Card><CardHeader><CardTitle className="font-heading text-lg font-bold">History</CardTitle></CardHeader><CardContent>{history.length ? <CycleHistory cycles={history} memberId={memberId} /> : <p className="text-base text-muted-foreground">Nothing logged yet.</p>}</CardContent></Card>
      </div>
      <Card className="lg:self-start"><CardHeader><CardTitle className="font-heading text-lg font-bold">Log a period</CardTitle></CardHeader><CardContent><CycleForm memberId={memberId} today={today} /></CardContent></Card>
    </div>
  );
}

async function SymptomsTab({ memberId, today }: { memberId: string; today: string }) {
  const rows = await db.select().from(symptomLogs).where(and(eq(symptomLogs.memberId, memberId), gte(symptomLogs.date, addDays(today, -27))));
  const todayMap = Object.fromEntries(rows.filter((r) => r.date === today).map((r) => [r.symptom, r.severity]));
  const days = Array.from({ length: 28 }, (_, i) => addDays(today, i - 27));
  const tracked = PCOS_SYMPTOMS.filter((s) => rows.some((r) => r.symptom === s.key));
  return (
    <div className="flex min-w-0 flex-col gap-6">
      <Card><CardHeader><CardTitle className="font-heading text-xl font-bold">How are you feeling today?</CardTitle><CardDescription>Tap to set: mild, moderate or strong. Tap again to clear.</CardDescription></CardHeader><CardContent><SymptomLogger memberId={memberId} today={todayMap} /></CardContent></Card>
      <Card className="min-w-0">
        <CardHeader><CardTitle className="font-heading text-xl font-bold">Last 4 weeks</CardTitle><CardDescription>Darker squares mean stronger symptoms. Patterns help your doctor.</CardDescription></CardHeader>
        <CardContent className="relative overflow-x-auto">
          {tracked.length === 0 ? <p className="text-base text-muted-foreground">No symptoms logged yet.</p> : (
            <table className="w-full min-w-[40rem] border-separate border-spacing-1">
              <caption className="sr-only">Symptom strength by day</caption>
              <tbody>
                {tracked.map((s) => (
                  <tr key={s.key}>
                    <th scope="row" className="pr-3 text-left text-sm font-medium whitespace-nowrap">{s.label}</th>
                    {days.map((d) => {
                      const v = rows.find((r) => r.symptom === s.key && r.date === d)?.severity ?? 0;
                      return <td key={d} title={`${formatDate(d)}: ${["none", "mild", "moderate", "strong"][v]}`} className={cn("h-6 w-6 rounded-md", v === 0 ? "bg-muted" : v === 1 ? "bg-fruit-grape/30" : v === 2 ? "bg-fruit-grape/60" : "bg-fruit-grape")}><span className="sr-only">{formatDate(d)} {["none", "mild", "moderate", "strong"][v]}</span></td>;
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

async function FoodTab({ memberId, today }: { memberId: string; today: string }) {
  const meals = await db.select().from(foodLogs).where(and(eq(foodLogs.memberId, memberId), gte(foodLogs.date, addDays(today, -1)))).orderBy(desc(foodLogs.createdAt));
  const label = (k: string) => PCOS_FOODS.find((f) => f.key === k)?.label ?? k;
  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
      <Card><CardHeader><CardTitle className="font-heading text-xl font-bold">Pair your carbs</CardTitle><CardDescription>Log a meal and get a quick tip. Protein and fibre with carbs keep energy steady.</CardDescription></CardHeader><CardContent><MealLogger memberId={memberId} /></CardContent></Card>
      <Card className="lg:self-start">
        <CardHeader><CardTitle className="font-heading text-lg font-bold">Today and yesterday</CardTitle></CardHeader>
        <CardContent>
          {meals.length === 0 ? <p className="text-base text-muted-foreground">No meals logged.</p> : (
            <ul className="divide-y divide-border">
              {meals.map((m) => (
                <li key={m.id} className="py-3">
                  <p className="text-sm font-semibold capitalize">{m.meal} · {m.date === today ? "today" : "yesterday"}</p>
                  <p className="text-[0.9375rem] text-muted-foreground">{m.items.map(label).join(", ")}</p>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
