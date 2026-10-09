import type { Metadata } from "next";
import Link from "next/link";
import { FileScan, Lock } from "lucide-react";
import { PageHeader } from "@/components/health/page-header";
import { RecordTimeline } from "@/components/health/record-timeline";
import { UploadDialog } from "@/components/records/upload-dialog";
import { buttonVariants } from "@/components/ui/button";
import { allowed, getContext } from "@/lib/context";
import { getRecords } from "@/lib/data";
import { istDate } from "@/lib/dates";
import { toTimeline } from "@/lib/serialize";

export const metadata: Metadata = { title: "Health records" };

export default async function RecordsPage({ searchParams }: { searchParams: Promise<{ upload?: string; member?: string }> }) {
  const sp = await searchParams;
  const ctx = await getContext();
  const viewable = ctx.visibleMembers.filter((m) => allowed(ctx, "records.view", m.id));
  const recs = await getRecords(viewable.map((m) => m.id));
  const members = viewable.map((m) => ({ id: m.id, name: m.name, tone: m.avatarTone }));
  return (
    <div className="flex flex-col gap-8 animate-rise">
      <PageHeader
        illustration="scan"
        title="Health records"
        description="Lab reports, prescriptions, scans and vaccination cards, on one timeline for the whole family."
        actions={
          <>
            <Link href="/records/scan" className={buttonVariants({ variant: "outline" })}>
              <FileScan aria-hidden="true" /> Scan a prescription
            </Link>
            <UploadDialog members={ctx.visibleMembers.map((m) => ({ id: m.id, name: m.name }))} defaultOpen={sp.upload === "1"} defaultMemberId={sp.member} today={istDate()} />
          </>
        }
      />
      <p className="flex items-center gap-2 text-[0.9375rem] text-muted-foreground">
        <Lock className="size-4" aria-hidden="true" /> {recs.length} records · every file is encrypted with AES-256 and only opens for family members whose role allows it.
      </p>
      <RecordTimeline records={recs.map(toTimeline)} members={members} />
    </div>
  );
}
