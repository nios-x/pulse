import type { Metadata } from "next";
import Link from "next/link";
import { Flag } from "lucide-react";
import { JourneyExplorer } from "@/components/game/journey-explorer";
import { JourneyHero, WinList } from "@/components/game/journey-hero";
import { EmptyState } from "@/components/health/empty-state";
import { MemberFilter } from "@/components/shell/member-filter";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getContext } from "@/lib/context";
import { istDate } from "@/lib/dates";
import { getActivity } from "@/lib/game-data";
import { summarize } from "@/lib/gamification";
import { buildJourneys, closestWin } from "@/lib/journeys";

export const metadata: Metadata = { title: "Journeys" };

/** Same window as Progress & rewards, so levels and XP agree between the two pages. */
const DAYS = 90;

export default async function JourneysPage({ searchParams }: { searchParams: Promise<{ member?: string }> }) {
  const { member: memberParam } = await searchParams;
  const ctx = await getContext();
  const member = ctx.visibleMembers.find((m) => m.id === memberParam) ?? ctx.visibleMembers.find((m) => m.id === ctx.self.id) ?? ctx.visibleMembers[0];
  const activity = await getActivity(member.id, DAYS);
  const game = summarize(activity, istDate());
  const { journeys, wins, daysShowingUp } = buildJourneys(activity, game.streak);
  const isSelf = member.id === ctx.self.id;
  const memberQuery = isSelf ? "" : `?member=${member.id}`;

  return (
    <div className="flex flex-col gap-8 animate-rise">
      <MemberFilter members={ctx.visibleMembers} active={isSelf ? null : member.id} basePath="/journeys" />

      <JourneyHero member={member} isSelf={isSelf} days={DAYS} wins={wins.length} daysShowingUp={daysShowingUp} xp={game.xp} closest={closestWin(journeys)} memberQuery={memberQuery} />

      <JourneyExplorer key={member.id} journeys={journeys} memberId={member.id} memberQuery={memberQuery} isSelf={isSelf} />

      <Card>
        <CardHeader>
          <CardTitle className="font-heading text-xl font-semibold">Wins so far</CardTitle>
          <CardDescription>Newest first, each on the day it happened.</CardDescription>
        </CardHeader>
        <CardContent>
          {wins.length ? (
            <WinList wins={wins} />
          ) : (
            <EmptyState icon={Flag} illustration="welcome" title="Your first win is close" description="Log a glass of water, a walk or a reading and it'll show up here." action={<Link href={`/progress${memberQuery}`} className={buttonVariants()}>Today&apos;s quests</Link>} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
