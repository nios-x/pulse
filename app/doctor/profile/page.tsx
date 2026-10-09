import type { Metadata } from "next";
import { DoctorProfileForm } from "@/components/doctor/profile-form";
import { PageHeader } from "@/components/health/page-header";
import { getDoctorContext } from "@/lib/doctor";

export const metadata: Metadata = { title: "Profile & hours · Doctor" };

export default async function DoctorProfilePage() {
  const { doctor } = await getDoctorContext();
  return (
    <div className="flex flex-col gap-8 animate-rise">
      <PageHeader illustration="eye-test" title="Profile & hours" description={`How families see you in the Pulse directory. Registration: ${doctor.registrationNo ?? "not added"}.`} />
      <DoctorProfileForm initial={{ specialty: doctor.specialty, clinic: doctor.clinic, city: doctor.city, phone: doctor.phone, fee: doctor.fee, languages: doctor.languages, teleconsult: doctor.teleconsult, slotMinutes: doctor.slotMinutes, bio: doctor.bio, hours: doctor.hours }} />
    </div>
  );
}
