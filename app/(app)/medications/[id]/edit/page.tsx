import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { medications } from "@/db/schema";
import { ForbiddenNotice } from "@/components/health/forbidden-notice";
import { PageHeader } from "@/components/health/page-header";
import { MedicationForm } from "@/components/meds/medication-form";
import { allowed, findVisibleMember, getContext } from "@/lib/context";
import { getMeds } from "@/lib/data";

export const metadata: Metadata = { title: "Edit medicine" };

export default async function EditMedicationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const ctx = await getContext();
  const [med] = await db.select().from(medications).where(eq(medications.id, id)).limit(1);
  const member = med ? findVisibleMember(ctx, med.memberId) : null;
  if (!med || !member) notFound();
  if (!allowed(ctx, "meds.manage", member.id)) return <ForbiddenNotice action="meds.manage" memberId={member.id} />;
  const meds = await getMeds([member.id]);
  return (
    <div className="flex flex-col gap-8 animate-rise">
      <PageHeader eyebrow={member.name} title={`Edit ${med.name}`} description="Changes apply from today. Past doses stay as they were." />
      <MedicationForm
        members={[{ id: member.id, name: member.name }]}
        existing={meds.map((m) => ({ id: m.id, memberId: m.memberId, name: m.name, genericName: m.genericName }))}
        initial={{
          id: med.id,
          memberId: med.memberId,
          name: med.name,
          genericName: med.genericName ?? "",
          strength: med.strength,
          form: med.form,
          instructions: med.instructions ?? "",
          times: med.times,
          startDate: med.startDate,
          endDate: med.endDate ?? "",
          pillsLeft: med.pillsLeft?.toString() ?? "",
          refillAt: med.refillAt.toString(),
          prescribedBy: med.prescribedBy ?? "",
        }}
      />
    </div>
  );
}
