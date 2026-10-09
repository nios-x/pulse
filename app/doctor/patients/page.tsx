import type { Metadata } from "next";
import Link from "next/link";
import { Clock, Droplet, TriangleAlert, Users } from "lucide-react";
import { EmptyState } from "@/components/health/empty-state";
import { MemberAvatar } from "@/components/health/member-avatar";
import { PageHeader } from "@/components/health/page-header";
import { StatusBadge, vitalTone } from "@/components/health/status-badge";
import { getVitals, latestByKind } from "@/lib/data";
import { ageFrom, formatDate } from "@/lib/dates";
import { doctorPatients, getDoctorContext } from "@/lib/doctor";
import { classify, formatReading } from "@/lib/vitals";

export const metadata: Metadata = { title: "Patients · Doctor" };

export default async function DoctorPatients() {
  const { doctor } = await getDoctorContext();
  const patients = await doctorPatients(doctor.id);
  const latest = latestByKind(await getVitals(patients.map((p) => p.member.id), 30));
  return (
    <div className="flex flex-col gap-8 animate-rise">
      <PageHeader title="Patients" description="People whose families are sharing their health summary with you right now. Access ends on its own." />
      {patients.length === 0 ? (
        <EmptyState icon={Users} illustration="patients" title="No patients sharing yet" description={`Give families your code ${doctor.connectCode}. When they connect or book you, their summary appears here.`} />
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {patients.map(({ member: m, access, familyName }) => {
            const bp = latest.get(m.id)?.get("bp");
            const c = bp ? classify(bp) : null;
            const severe = m.allergies.find((a) => a.severity === "severe");
            return (
              <li key={m.id}>
                <Link href={`/doctor/patients/${m.id}`} className="flex h-full flex-col gap-4 rounded-2xl border border-border bg-card p-5 shadow-soft transition-shadow hover:shadow-pop">
                  <div className="flex items-center gap-3">
                    <MemberAvatar name={m.name} tone={m.avatarTone} size="lg" />
                    <div className="min-w-0">
                      <p className="truncate text-lg font-semibold">{m.name}</p>
                      <p className="text-sm text-muted-foreground">{ageFrom(m.dateOfBirth)} yrs · {m.sex ?? "—"} · {familyName}</p>
                    </div>
                    {m.bloodGroup && <span className="ml-auto inline-flex h-7 items-center gap-1 rounded-full border border-border px-2 text-sm font-semibold"><Droplet className="size-3.5" aria-hidden="true" />{m.bloodGroup}</span>}
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {m.conditions.slice(0, 3).map((x) => <span key={x.name} className="inline-flex h-6 items-center rounded-full bg-muted px-2 text-xs font-medium text-muted-foreground">{x.name}</span>)}
                  </div>
                  <div className="mt-auto flex flex-wrap items-center gap-2">
                    {bp && c && <StatusBadge {...vitalTone(c.status)} label={`BP ${c.label}`} value={formatReading(bp)} size="sm" />}
                    {severe && <StatusBadge tone="warning" icon={TriangleAlert} label={`Allergy: ${severe.name}`} size="sm" />}
                  </div>
                  <p className="flex items-center gap-1.5 text-xs text-muted-foreground"><Clock className="size-3.5" aria-hidden="true" /> {access.reason === "booking" ? "Shared for an appointment" : "Connected by family"} · until {formatDate(access.expiresAt)}</p>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
