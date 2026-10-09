import type { Metadata } from "next";
import { PageHeader } from "@/components/health/page-header";
import { MedicationForm } from "@/components/meds/medication-form";
import { allowed, getContext } from "@/lib/context";
import { getMeds } from "@/lib/data";
import { istDate, nowMs } from "@/lib/dates";
import { ForbiddenNotice } from "@/components/health/forbidden-notice";

export const metadata: Metadata = { title: "Add medicine" };

export default async function NewMedicationPage({ searchParams }: { searchParams: Promise<{ member?: string; name?: string; strength?: string; times?: string; instructions?: string; days?: string }> }) {
  const sp = await searchParams;
  const ctx = await getContext();
  const members = ctx.visibleMembers.filter((m) => allowed(ctx, "meds.manage", m.id));
  if (!members.length) return <ForbiddenNotice action="meds.manage" />;
  const meds = await getMeds(ctx.visibleMembers.map((m) => m.id));
  const memberId = members.find((m) => m.id === sp.member)?.id ?? members[0].id;
  const days = Number(sp.days);
  const end = Number.isFinite(days) && days > 0 ? new Date(nowMs() + days * 86_400_000) : null;
  return (
    <div className="flex flex-col gap-8 animate-rise">
      <PageHeader title="Add a medicine" description="Set the schedule once. The family gets reminders and a daily checklist." />
      <MedicationForm
        members={members.map((m) => ({ id: m.id, name: m.name }))}
        existing={meds.map((m) => ({ id: m.id, memberId: m.memberId, name: m.name, genericName: m.genericName }))}
        initial={{
          memberId,
          name: sp.name ?? "",
          genericName: "",
          strength: sp.strength ?? "",
          form: "tablet",
          instructions: sp.instructions ?? "",
          times: sp.times ? sp.times.split(",").filter((t) => /^\d{2}:\d{2}$/.test(t)) : ["08:00"],
          startDate: istDate(),
          endDate: end ? istDate(end) : "",
          pillsLeft: "",
          refillAt: "7",
          prescribedBy: "",
        }}
      />
    </div>
  );
}
