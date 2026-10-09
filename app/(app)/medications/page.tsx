import type { Metadata } from "next";
import Link from "next/link";
import { FileScan, Pill, Plus } from "lucide-react";
import { DoseList } from "@/components/health/dose-list";
import { EmptyState } from "@/components/health/empty-state";
import { InteractionPanel } from "@/components/health/interaction-panel";
import { MedicationCard } from "@/components/health/medication-card";
import { PageHeader } from "@/components/health/page-header";
import { RoleGate } from "@/components/health/role-gate";
import { InteractionChecker } from "@/components/meds/interaction-checker";
import { MemberFilter } from "@/components/shell/member-filter";
import { SpeakButton } from "@/components/voice/speak-button";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getContext } from "@/lib/context";
import { getMeds, getTodayDoses } from "@/lib/data";
import { formatTime } from "@/lib/dates";
import { checkInteractions } from "@/lib/drugs";
import { firstName } from "@/lib/labels";
import { refillStatus } from "@/lib/meds";

export const metadata: Metadata = { title: "Medicines" };

export default async function MedicationsPage({ searchParams }: { searchParams: Promise<{ member?: string }> }) {
  const { member: memberParam } = await searchParams;
  const ctx = await getContext();
  const active = ctx.visibleMembers.find((m) => m.id === memberParam) ?? null;
  const scope = active ? [active] : ctx.visibleMembers;
  const ids = scope.map((m) => m.id);
  const [meds, doses, allMeds] = await Promise.all([getMeds(ids), getTodayDoses(ids), getMeds(ctx.visibleMembers.map((m) => m.id))]);
  const memberMap = new Map(ctx.visibleMembers.map((m) => [m.id, { name: m.name, tone: m.avatarTone }]));
  const refills = meds.filter((m) => ["soon", "out"].includes(refillStatus(m).status));
  const taken = doses.filter((d) => d.state === "taken").length;
  const pendingDoses = doses.filter((d) => d.state === "due" || d.state === "upcoming");
  const speech = pendingDoses.length
    ? `Medicines still to take today. ${pendingDoses.map((d) => `${formatTime(d.time)}: ${firstName(memberMap.get(d.memberId)?.name ?? "")}, ${d.name} ${d.strength}${d.instructions ? `, ${d.instructions}` : ""}.`).join(" ")}`
    : "All of today's medicines are done.";

  return (
    <div className="flex flex-col gap-8 animate-rise">
      <PageHeader
        title="Medicines"
        description="Today's doses, every prescription, refills and clashes, for the whole family."
        actions={
          <>
            <Link href="/records/scan" className={buttonVariants({ variant: "outline" })}>
              <FileScan aria-hidden="true" /> Scan a prescription
            </Link>
            <RoleGate action="meds.manage" memberId={active?.id ?? null}>
              <Link href={`/medications/new${active ? `?member=${active.id}` : ""}`} className={buttonVariants()}>
                <Plus aria-hidden="true" /> Add medicine
              </Link>
            </RoleGate>
          </>
        }
      />
      <MemberFilter members={ctx.visibleMembers} active={active?.id ?? null} basePath="/medications" />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <Card>
          <CardHeader className="gap-3 sm:grid-cols-[1fr_auto]">
            <div className="space-y-1">
              <CardTitle>Today&apos;s doses</CardTitle>
              <CardDescription>{doses.length ? `${taken} of ${doses.length} taken` : "Nothing scheduled today"}</CardDescription>
            </div>
            {doses.length > 0 && <SpeakButton text={speech} label="Read today's list aloud" />}
          </CardHeader>
          <CardContent>
            {doses.length === 0 ? (
              <EmptyState compact icon={Pill} title="No doses today" description="Medicines with a schedule show up here each day." />
            ) : (
              <DoseList doses={doses} members={memberMap} showMember={!active && ctx.visibleMembers.length > 1} />
            )}
          </CardContent>
        </Card>

        <div className="flex flex-col gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Refills due</CardTitle>
              <CardDescription>We count tablets down as doses are ticked</CardDescription>
            </CardHeader>
            <CardContent>
              {refills.length === 0 ? (
                <p className="text-base text-muted-foreground">Everything is well stocked.</p>
              ) : (
                <ul className="divide-y divide-border">
                  {refills.map((m) => {
                    const r = refillStatus(m);
                    return (
                      <li key={m.id} className="flex items-center justify-between gap-3 py-3">
                        <span>
                          <span className="block text-base font-medium">{m.name} {m.strength}</span>
                          <span className="block text-sm text-muted-foreground">{firstName(memberMap.get(m.memberId)?.name ?? "")} · {m.pillsLeft} left</span>
                        </span>
                        <span className={r.status === "out" ? "text-sm font-semibold text-danger" : "text-sm font-semibold text-warning"}>
                          {r.status === "out" ? "Out of stock" : `~${r.daysLeft} days left`}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              )}
            </CardContent>
          </Card>
          <Card id="interactions">
            <CardHeader>
              <CardTitle>Clashes in current medicines</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-5">
              {scope.map((m) => {
                const mine = meds.filter((x) => x.memberId === m.id);
                if (!mine.length) return null;
                const { interactions, duplicates } = checkInteractions(mine.map((x) => ({ id: x.id, name: x.name, genericName: x.genericName })));
                if (!interactions.length && !duplicates.length && !active) return null;
                return (
                  <div key={m.id} className="space-y-2">
                    {!active && <h3 className="text-base font-semibold">{m.name}</h3>}
                    <InteractionPanel interactions={interactions} duplicates={duplicates} count={mine.length} memberName={firstName(m.name)} />
                  </div>
                );
              })}
              {!active && scope.every((m) => {
                const mine = meds.filter((x) => x.memberId === m.id);
                const r = checkInteractions(mine.map((x) => ({ id: x.id, name: x.name, genericName: x.genericName })));
                return !r.interactions.length && !r.duplicates.length;
              }) && <p className="text-base text-muted-foreground">No known clashes in anyone&apos;s medicines.</p>}
            </CardContent>
          </Card>
        </div>
      </div>

      <section aria-labelledby="all-meds" className="flex flex-col gap-4">
        <h2 id="all-meds" className="text-xl font-semibold">{active ? `${firstName(active.name)}'s medicines` : "All medicines"}</h2>
        {meds.length === 0 ? (
          <EmptyState
            icon={Pill}
            title="No medicines yet"
            description="Add medicines by hand or scan a prescription. Pulse will remind the family at each dose time."
            action={<RoleGate action="meds.manage" mode="hide"><Link href="/medications/new" className={buttonVariants()}>Add a medicine</Link></RoleGate>}
          />
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {meds.map((m) => <MedicationCard key={m.id} med={m} member={active ? undefined : memberMap.get(m.memberId)} />)}
          </div>
        )}
      </section>

      <Card>
        <CardHeader>
          <CardTitle>Check before you buy</CardTitle>
          <CardDescription>Got something from the chemist? See if it clashes with what this person already takes, and whether a cheaper generic exists.</CardDescription>
        </CardHeader>
        <CardContent>
          <InteractionChecker
            members={ctx.visibleMembers.map((m) => ({ id: m.id, name: m.name }))}
            meds={allMeds.map((m) => ({ id: m.id, memberId: m.memberId, name: m.name, genericName: m.genericName }))}
          />
        </CardContent>
      </Card>
    </div>
  );
}
