import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  CalendarDays,
  CalendarPlus,
  Check,
  CircleSlash,
  Clock,
  Droplet,
  FileUp,
  HeartPulse,
  Phone,
  Pill,
  Plus,
  Ruler,
  Siren,
  TriangleAlert,
  X,
} from "lucide-react";
import { AlertList } from "@/components/health/alert-list";
import { AppointmentItem } from "@/components/health/appointment-item";
import { EditProfileDialog } from "@/components/health/edit-profile-dialog";
import { EmptyState } from "@/components/health/empty-state";
import { InteractionPanel } from "@/components/health/interaction-panel";
import { MedicationCard } from "@/components/health/medication-card";
import { MemberAvatar } from "@/components/health/member-avatar";
import { RecordTimeline } from "@/components/health/record-timeline";
import { RoleBadge } from "@/components/health/role-badge";
import { RoleGate } from "@/components/health/role-gate";
import { SafetyNote } from "@/components/health/safety-note";
import { StatusBadge, vitalTone } from "@/components/health/status-badge";
import { VitalChart } from "@/components/health/vital-chart";
import { VitalDialog } from "@/components/health/vital-dialog";
import { TabLinks } from "@/components/shell/tab-links";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { VitalKind } from "@/db/schema";
import { allowed, findVisibleMember, getContext } from "@/lib/context";
import { doseHistory, getMemberOverview } from "@/lib/data";
import { ageFrom, formatDay, formatTime } from "@/lib/dates";
import { checkInteractions } from "@/lib/drugs";
import { firstName, relationLabel } from "@/lib/labels";
import { bmi, classify, formatReading, VITAL_META } from "@/lib/vitals";
import { toPoints, toTimeline } from "@/lib/serialize";
import { cn } from "@/lib/utils";

const TABS = ["overview", "vitals", "medications", "records", "appointments"] as const;
type Tab = (typeof TABS)[number];

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const ctx = await getContext();
  const m = findVisibleMember(ctx, id);
  return { title: m ? m.name : "Member" };
}

export default async function MemberPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ tab?: string }> }) {
  const [{ id }, { tab: rawTab }] = await Promise.all([params, searchParams]);
  const ctx = await getContext();
  const member = findVisibleMember(ctx, id);
  if (!member) notFound();
  const tab: Tab = (TABS as readonly string[]).includes(rawTab ?? "") ? (rawTab as Tab) : "overview";
  const data = await getMemberOverview(member);
  const isMe = member.id === ctx.self.id;
  const age = ageFrom(member.dateOfBirth);
  const first = firstName(member.name);
  const weight = data.latest.get("weight");
  const memberBmi = bmi(weight ? Number(weight.value) : null, member.heightCm);
  const nowMs = data.now.instant.getTime();
  const upcoming = data.appointments.filter((a) => a.status === "scheduled" && a.startsAt.getTime() >= nowMs - 3_600_000);
  const past = data.appointments.filter((a) => !upcoming.includes(a)).reverse();
  const href = (t: Tab) => `/members/${member.id}${t === "overview" ? "" : `?tab=${t}`}`;

  return (
    <div className="flex flex-col gap-8 animate-rise">
      {/* Header */}
      <header className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex items-start gap-4">
          <MemberAvatar name={member.name} tone={member.avatarTone} size="xl" />
          <div className="min-w-0 space-y-2">
            <h1 className="text-[1.75rem] leading-tight font-semibold sm:text-[2rem]">{member.name}</h1>
            <p className="text-base text-muted-foreground">
              {relationLabel(member.relation, member.sex, isMe)}
              {age != null && ` · ${age} years`}
              {member.sex && ` · ${member.sex[0].toUpperCase()}${member.sex.slice(1)}`}
            </p>
            <div className="flex flex-wrap items-center gap-2">
              {member.bloodGroup && (
                <span className="inline-flex h-7 items-center gap-1.5 rounded-full border border-border bg-card px-2.5 text-sm font-semibold">
                  <Droplet className="size-4 text-muted-foreground" aria-hidden="true" /> Blood group {member.bloodGroup}
                </span>
              )}
              {member.heightCm && (
                <span className="inline-flex h-7 items-center gap-1.5 rounded-full border border-border bg-card px-2.5 text-sm">
                  <Ruler className="size-4 text-muted-foreground" aria-hidden="true" /> {member.heightCm} cm{memberBmi ? ` · BMI ${memberBmi}` : ""}
                </span>
              )}
              {member.userId ? <RoleBadge role={member.role} /> : <span className="text-sm text-muted-foreground">No login · managed by family</span>}
            </div>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href={`/emergency/${member.id}`} className={buttonVariants({ variant: "destructive-outline" })}>
            <Siren aria-hidden="true" /> Emergency card
          </Link>
          <RoleGate action="member.edit" memberId={member.id}>
            <EditProfileDialog member={member} />
          </RoleGate>
          <VitalDialog members={[{ id: member.id, name: member.name }]} defaultMemberId={member.id} />
        </div>
      </header>

      <TabLinks
        label={`${first}'s health`}
        active={tab}
        tabs={[
          { key: "overview", label: "Overview", href: href("overview") },
          { key: "vitals", label: "Vitals", href: href("vitals") },
          { key: "medications", label: "Medicines", href: href("medications"), count: data.activeMeds.length },
          { key: "records", label: "Records", href: href("records"), count: data.records.length },
          { key: "appointments", label: "Appointments", href: href("appointments"), count: upcoming.length || undefined },
        ]}
      />

      {tab === "overview" && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
          <div className="flex flex-col gap-6">
            {data.alerts.length > 0 && (
              <Card className="overflow-hidden">
                <CardHeader className="pb-1">
                  <CardTitle>Needs attention</CardTitle>
                </CardHeader>
                <div className="mt-3 border-t border-border">
                  <AlertList alerts={data.alerts} />
                </div>
              </Card>
            )}

            <Card>
              <CardHeader>
                <CardTitle>Latest readings</CardTitle>
                <CardDescription>The most recent value for each measurement</CardDescription>
                <CardAction>
                  <Link href={href("vitals")} className={buttonVariants({ variant: "ghost", size: "sm" })}>Trends</Link>
                </CardAction>
              </CardHeader>
              <CardContent>
                {data.latest.size === 0 ? (
                  <EmptyState compact icon={HeartPulse} title="No readings yet" description={`Record ${first}'s BP, sugar or weight to start seeing trends.`} />
                ) : (
                  <dl className="grid gap-3 sm:grid-cols-2">
                    {(["bp", "sugar", "weight", "pulse", "spo2", "temperature"] as VitalKind[])
                      .filter((k) => data.latest.has(k))
                      .map((k) => {
                        const v = data.latest.get(k)!;
                        const c = classify(v);
                        return (
                          <div key={k} className="rounded-lg border border-border p-4">
                            <dt className="text-sm text-muted-foreground">{VITAL_META[k].label}</dt>
                            <dd className="mt-1 space-y-2">
                              <p className="text-2xl font-semibold tabular">
                                {formatReading(v)} <span className="text-base font-normal text-muted-foreground">{VITAL_META[k].unit}</span>
                              </p>
                              <div className="flex flex-wrap items-center gap-2">
                                {k !== "weight" && <StatusBadge {...vitalTone(c.status)} label={c.label} size="sm" />}
                                <span className="text-sm text-muted-foreground">{formatDay(v.measuredAt)}, {formatTime(v.measuredAt)}</span>
                              </div>
                            </dd>
                          </div>
                        );
                      })}
                  </dl>
                )}
                <SafetyNote className="mt-4" />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Medicines</CardTitle>
                <CardDescription>
                  {data.adherence7.percent != null
                    ? `Took ${data.adherence7.percent}% of doses in the last 7 days (${data.adherence7.taken} of ${data.adherence7.due})`
                    : "No doses due yet"}
                </CardDescription>
                <CardAction>
                  <Link href={href("medications")} className={buttonVariants({ variant: "ghost", size: "sm" })}>Manage</Link>
                </CardAction>
              </CardHeader>
              <CardContent>
                {data.activeMeds.length === 0 ? (
                  <p className="text-base text-muted-foreground">No active medicines.</p>
                ) : (
                  <ul className="divide-y divide-border">
                    {data.activeMeds.map((m) => (
                      <li key={m.id} className="flex items-center justify-between gap-3 py-3">
                        <span className="flex min-w-0 items-center gap-3">
                          <Pill className="size-5 shrink-0 text-muted-foreground" aria-hidden="true" />
                          <span className="min-w-0">
                            <span className="block truncate text-base font-medium">{m.name} <span className="font-normal text-muted-foreground">{m.strength}</span></span>
                            <span className="block truncate text-sm text-muted-foreground">{m.instructions}</span>
                          </span>
                        </span>
                        <span className="shrink-0 text-sm text-muted-foreground tabular">{m.times.map((t) => formatTime(t)).join(", ")}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="flex flex-col gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Allergies &amp; conditions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-5">
                <div>
                  <h3 className="mb-2 text-sm font-medium text-muted-foreground">Allergies</h3>
                  {member.allergies.length === 0 ? (
                    <p className="text-base">No known allergies</p>
                  ) : (
                    <ul className="space-y-2">
                      {member.allergies.map((a) => (
                        <li key={a.name} className="flex items-start gap-3 rounded-lg border border-warning-border bg-warning-soft/60 px-3 py-2.5">
                          <TriangleAlert className="mt-0.5 size-5 shrink-0 text-warning" aria-hidden="true" />
                          <span>
                            <span className="block text-base font-semibold">{a.name} <span className="text-sm font-medium text-warning">· {a.severity}</span></span>
                            {a.reaction && <span className="block text-sm text-muted-foreground">{a.reaction}</span>}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
                <div>
                  <h3 className="mb-2 text-sm font-medium text-muted-foreground">Conditions</h3>
                  {member.conditions.length === 0 ? (
                    <p className="text-base">None recorded</p>
                  ) : (
                    <ul className="flex flex-wrap gap-2">
                      {member.conditions.map((c) => (
                        <li key={c.name} className="inline-flex h-8 items-center rounded-full bg-muted px-3 text-[0.9375rem]">
                          {c.name}
                          {c.since && <span className="ml-1.5 text-sm text-muted-foreground">since {c.since}</span>}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
                {member.notes && (
                  <div>
                    <h3 className="mb-1 text-sm font-medium text-muted-foreground">Notes</h3>
                    <p className="text-base">{member.notes}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Emergency contacts</CardTitle>
              </CardHeader>
              <CardContent>
                {member.emergencyContacts.length === 0 ? (
                  <p className="text-base text-muted-foreground">No contacts yet. Add at least one for the emergency card.</p>
                ) : (
                  <ul className="space-y-2">
                    {member.emergencyContacts.map((c) => (
                      <li key={c.phone}>
                        <a href={`tel:${c.phone.replace(/\s/g, "")}`} className="flex min-h-14 items-center gap-3 rounded-lg border border-border px-3 py-2 transition-colors hover:bg-muted">
                          <span className="flex size-10 items-center justify-center rounded-full bg-accent text-accent-foreground">
                            <Phone className="size-4" aria-hidden="true" />
                          </span>
                          <span className="min-w-0">
                            <span className="block text-base font-medium">{c.name}</span>
                            <span className="block text-sm text-muted-foreground">{c.relation} · {c.phone}</span>
                          </span>
                        </a>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Next appointment</CardTitle>
              </CardHeader>
              <CardContent>
                {upcoming[0] ? (
                  <div className="space-y-1">
                    <p className="text-base font-semibold">{upcoming[0].doctorName}</p>
                    <p className="text-[0.9375rem] text-muted-foreground">{upcoming[0].reason ?? upcoming[0].specialty}</p>
                    <p className="text-[0.9375rem]">{formatDay(upcoming[0].startsAt)} · {formatTime(upcoming[0].startsAt)}</p>
                  </div>
                ) : (
                  <p className="text-base text-muted-foreground">Nothing booked.</p>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {tab === "vitals" && (
        <div className="flex flex-col gap-6">
          {(["bp", "sugar", "weight", "temperature", "pulse", "spo2"] as VitalKind[]).map((k) => {
            const pts = toPoints(data.vitals.filter((v) => v.kind === k));
            if (!pts.length && !["bp", "sugar", "weight"].includes(k)) return null;
            return <VitalChart key={k} kind={k} points={pts} now={nowMs} />;
          })}
          <SafetyNote>Shaded bands show general adult ranges, not personal targets. Your doctor sets your targets. Not a diagnosis. Consult a doctor.</SafetyNote>
        </div>
      )}

      {tab === "medications" && <MedicationsTab member={member} data={data} canManage={allowed(ctx, "meds.manage", member.id)} />}

      {tab === "records" && (
        <div className="flex flex-col gap-4">
          <div className="flex justify-end">
            <RoleGate action="records.upload" memberId={member.id}>
              <Link href={`/records?upload=1&member=${member.id}`} className={buttonVariants()}>
                <FileUp aria-hidden="true" /> Upload a record
              </Link>
            </RoleGate>
          </div>
          <RecordTimeline records={data.records.map(toTimeline)} members={[{ id: member.id, name: member.name, tone: member.avatarTone }]} showFilters={false} />
        </div>
      )}

      {tab === "appointments" && (
        <div className="flex flex-col gap-6">
          <div className="flex justify-end">
            <RoleGate action="appointments.manage" memberId={member.id}>
              <Link href={`/appointments/book?member=${member.id}`} className={buttonVariants()}>
                <CalendarPlus aria-hidden="true" /> Book a doctor
              </Link>
            </RoleGate>
          </div>
          <section className="space-y-3">
            <h2 className="text-lg font-semibold">Upcoming</h2>
            {upcoming.length === 0 ? (
              <EmptyState compact icon={CalendarDays} title="Nothing booked" description={`Book a clinic visit or a video consult for ${first}.`} />
            ) : (
              <ul className="flex flex-col gap-3">{upcoming.map((a) => <AppointmentItem key={a.id} appt={a} />)}</ul>
            )}
          </section>
          {past.length > 0 && (
            <section className="space-y-3">
              <h2 className="text-lg font-semibold">Past</h2>
              <ul className="flex flex-col gap-3">{past.map((a) => <AppointmentItem key={a.id} appt={a} />)}</ul>
            </section>
          )}
        </div>
      )}
    </div>
  );
}

function MedicationsTab({
  member,
  data,
  canManage,
}: {
  member: { id: string; name: string };
  data: Awaited<ReturnType<typeof getMemberOverview>>;
  canManage: boolean;
}) {
  const { interactions, duplicates } = checkInteractions(data.activeMeds.map((m) => ({ id: m.id, name: m.name, genericName: m.genericName })));
  const history = doseHistory(data.activeMeds, data.logs, 14, data.now);
  const stopped = data.meds.filter((m) => !m.active);
  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold">Current medicines</h2>
          <p className="text-[0.9375rem] text-muted-foreground">
            30-day adherence: {data.adherence30.percent != null ? `${data.adherence30.percent}%` : "—"}
          </p>
        </div>
        <RoleGate action="meds.manage" memberId={member.id}>
          <Link href={`/medications/new?member=${member.id}`} className={buttonVariants()}>
            <Plus aria-hidden="true" /> Add medicine
          </Link>
        </RoleGate>
      </div>
      {data.activeMeds.length === 0 ? (
        <EmptyState icon={Pill} title="No medicines" description="Add a medicine to get dose reminders and refill alerts." />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">{data.activeMeds.map((m) => <MedicationCard key={m.id} med={m} />)}</div>
      )}

      <section id="interactions" className="space-y-3">
        <h2 className="text-xl font-semibold">Medicine clashes</h2>
        <InteractionPanel interactions={interactions} duplicates={duplicates} memberName={firstName(member.name)} count={data.activeMeds.length} />
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">Taken and missed, last 14 days</h2>
        {history.length === 0 ? (
          <p className="text-base text-muted-foreground">No doses yet.</p>
        ) : (
          <Card>
            <CardContent className="overflow-x-auto">
              <ul className="flex flex-col divide-y divide-border">
                {history.map((day) => (
                  <li key={day.date} className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:gap-4">
                    <span className="w-28 shrink-0 text-[0.9375rem] font-medium">{formatDay(day.date)}</span>
                    <ul className="flex flex-wrap gap-1.5">
                      {day.items.map((it) => {
                        const tone = it.state === "taken" ? "success" : it.state === "missed" ? "danger" : "neutral";
                        const Icon = it.state === "taken" ? Check : it.state === "missed" ? X : it.state === "skipped" ? CircleSlash : Clock;
                        return (
                          <li key={`${it.medicationId}-${it.time}`}>
                            <span
                              className={cn(
                                "inline-flex h-8 items-center gap-1.5 rounded-full border px-2.5 text-sm",
                                tone === "success" && "border-success-border bg-success-soft text-success",
                                tone === "danger" && "border-danger-border bg-danger-soft text-danger",
                                tone === "neutral" && "border-border bg-muted text-muted-foreground"
                              )}
                            >
                              <Icon className="size-3.5" aria-hidden="true" />
                              <span className="sr-only">{it.state === "upcoming" || it.state === "due" ? "not yet due" : it.state}:</span>
                              {it.name} {formatTime(it.time)}
                            </span>
                          </li>
                        );
                      })}
                    </ul>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}
      </section>

      {stopped.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-xl font-semibold">Stopped</h2>
          <div className="grid gap-4 md:grid-cols-2">{stopped.map((m) => <MedicationCard key={m.id} med={m} />)}</div>
        </section>
      )}
      {!canManage && <p className="sr-only">You can view these medicines but not change them.</p>}
    </div>
  );
}
