import type { Metadata } from "next";
import { BookingFlow } from "@/components/appointments/booking-flow";
import { ForbiddenNotice } from "@/components/health/forbidden-notice";
import { PageHeader } from "@/components/health/page-header";
import { allowed, getContext } from "@/lib/context";
import { getDoctors } from "@/lib/data";
import { istDate } from "@/lib/dates";

export const metadata: Metadata = { title: "Book a doctor" };

export default async function BookPage({ searchParams }: { searchParams: Promise<{ member?: string; specialty?: string }> }) {
  const sp = await searchParams;
  const ctx = await getContext();
  const members = ctx.visibleMembers.filter((m) => allowed(ctx, "appointments.manage", m.id));
  if (!members.length) return <ForbiddenNotice action="appointments.manage" />;
  const doctors = await getDoctors();
  return (
    <div className="flex flex-col gap-8 animate-rise">
      <PageHeader illustration="consult" title="Book a doctor" description="Clinic visits or video consults with doctors who speak your language. The family gets a confirmation email." />
      <BookingFlow
        today={istDate()}
        members={members.map((m) => ({ id: m.id, name: m.name }))}
        defaultMemberId={sp.member}
        suggestedSpecialty={sp.specialty}
        doctors={doctors.map((d) => ({ id: d.id, name: d.name, specialty: d.specialty, clinic: d.clinic, city: d.city, languages: d.languages, yearsExperience: d.yearsExperience, fee: d.fee, rating: Number(d.rating), teleconsult: d.teleconsult, hours: d.hours }))}
      />
    </div>
  );
}
