import type { Metadata } from "next";
import { ForbiddenNotice } from "@/components/health/forbidden-notice";
import { PageHeader } from "@/components/health/page-header";
import { PrescriptionScanner } from "@/components/records/prescription-scanner";
import { aiEnabled } from "@/lib/ai";
import { allowed, getContext } from "@/lib/context";

export const metadata: Metadata = { title: "Scan a prescription" };

export default async function ScanPage() {
  const ctx = await getContext();
  const members = ctx.visibleMembers.filter((m) => allowed(ctx, "records.upload", m.id));
  if (!members.length) return <ForbiddenNotice action="records.upload" />;
  return (
    <div className="flex flex-col gap-8 animate-rise">
      <PageHeader title="Scan a prescription" description="Take a photo of the doctor's prescription. AI reads the medicines, you check them, and Pulse sets up the reminders." />
      <PrescriptionScanner members={members.map((m) => ({ id: m.id, name: m.name }))} aiEnabled={aiEnabled()} />
    </div>
  );
}
