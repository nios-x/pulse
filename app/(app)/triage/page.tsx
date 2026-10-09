import type { Metadata } from "next";
import { desc, inArray } from "drizzle-orm";
import { History, ShieldCheck } from "lucide-react";
import { db } from "@/db";
import { triageSessions } from "@/db/schema";
import { ForbiddenNotice } from "@/components/health/forbidden-notice";
import { PageHeader } from "@/components/health/page-header";
import { StatusBadge } from "@/components/health/status-badge";
import { TriageFlow } from "@/components/triage/triage-flow";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { aiEnabled } from "@/lib/ai";
import { allowed, getContext } from "@/lib/context";
import { ageFrom } from "@/lib/dates";
import { firstName, timeAgo } from "@/lib/labels";

export const metadata: Metadata = { title: "Symptom check" };

const LEVEL_BADGE = {
  emergency: { tone: "danger" as const, label: "Emergency" },
  urgent: { tone: "danger" as const, label: "See doctor today" },
  doctor: { tone: "warning" as const, label: "Book a doctor" },
  self_care: { tone: "success" as const, label: "Home care" },
};

export default async function TriagePage({ searchParams }: { searchParams: Promise<{ member?: string }> }) {
  const { member } = await searchParams;
  const ctx = await getContext();
  const members = ctx.visibleMembers.filter((m) => allowed(ctx, "triage.use", m.id));
  if (!members.length) return <ForbiddenNotice action="triage.use" />;
  const history = await db.select().from(triageSessions).where(inArray(triageSessions.memberId, members.map((m) => m.id))).orderBy(desc(triageSessions.createdAt)).limit(6);
  const names = new Map(members.map((m) => [m.id, m.name]));
  return (
    <div className="flex flex-col gap-8 animate-rise">
      <PageHeader
        title="Symptom check"
        description="Describe how someone feels, by typing or speaking in your language. You'll get how urgently to seek care, never a diagnosis."
        actions={
          <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1.5 text-sm">
            <ShieldCheck className="size-4 text-primary" aria-hidden="true" /> Safety rules first{aiEnabled() ? ", then AI" : " (AI off)"}
          </span>
        }
      />
      <TriageFlow defaultMemberId={member} members={members.map((m) => ({ id: m.id, name: m.name, sex: m.sex, age: ageFrom(m.dateOfBirth) }))} />
      {history.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><History className="size-5 text-muted-foreground" aria-hidden="true" /> Recent checks</CardTitle></CardHeader>
          <CardContent>
            <ul className="divide-y divide-border">
              {history.map((h) => (
                <li key={h.id} className="flex flex-col gap-1.5 py-3 sm:flex-row sm:items-center sm:justify-between">
                  <span className="min-w-0">
                    <span className="block text-base font-medium">{firstName(names.get(h.memberId) ?? "")}: <span className="font-normal">{h.symptoms.slice(0, 90)}{h.symptoms.length > 90 ? "…" : ""}</span></span>
                    <span className="text-sm text-muted-foreground">{timeAgo(h.createdAt)} · {h.source === "rules" ? "Safety rules" : "Safety rules + AI"}</span>
                  </span>
                  <StatusBadge tone={LEVEL_BADGE[h.level].tone} label={LEVEL_BADGE[h.level].label} size="sm" />
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
