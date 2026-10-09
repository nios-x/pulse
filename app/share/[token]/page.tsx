import type { Metadata } from "next";
import Link from "next/link";
import { Clock, FileText, Lock, ShieldOff } from "lucide-react";
import { LogoMark } from "@/components/brand/logo";
import { EmergencyCard } from "@/components/emergency/emergency-card";
import { SafetyNote } from "@/components/health/safety-note";
import { StatusBadge, vitalTone } from "@/components/health/status-badge";
import { getAppointments, getDoseLogs, getMeds, getRecords, getVitals, latestByKind } from "@/lib/data";
import { addDays, formatDate, formatDateTime, formatTime, istDate } from "@/lib/dates";
import { emergencyData } from "@/lib/emergency";
import { RECORD_TYPE_LABEL } from "@/lib/labels";
import { adherence } from "@/lib/meds";
import { resolveShare } from "@/lib/share";
import { classify, formatReading, VITAL_META } from "@/lib/vitals";
import { audit } from "@/lib/audit";
import type { VitalKind } from "@/db/schema";

export const metadata: Metadata = { title: "Shared health information", robots: { index: false, follow: false } };

export default async function SharePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const state = await resolveShare(token, true);

  if (state.status !== "ok") {
    return (
      <Shell>
        <div className="mx-auto flex max-w-md flex-col items-center gap-4 py-20 text-center">
          <span className="flex size-14 items-center justify-center rounded-full bg-muted text-muted-foreground"><ShieldOff className="size-7" aria-hidden="true" /></span>
          <h1 className="text-2xl font-semibold">{state.status === "expired" ? "This link has expired" : state.status === "revoked" ? "This link was turned off" : "Link not found"}</h1>
          <p className="text-base text-muted-foreground">Shared health links only work for a limited time. Ask the family for a new link.</p>
        </div>
      </Shell>
    );
  }

  const { link, member } = state;
  await audit(link.familyId, null, "share.viewed", { label: link.label, scope: link.scope });
  const expires = `Link works until ${formatDateTime(link.expiresAt)}`;

  if (link.scope === "emergency") {
    const data = await emergencyData(member);
    return (
      <Shell note={expires}>
        <EmergencyCard data={data} className="mx-auto w-full max-w-4xl" />
      </Shell>
    );
  }

  const now = { instant: new Date(), date: istDate(), time: "23:59" };
  const [data, meds, vitals, logs, appts, recs] = await Promise.all([
    emergencyData(member),
    getMeds([member.id]),
    getVitals([member.id], 90),
    getDoseLogs([member.id], addDays(istDate(), -30), istDate()),
    getAppointments([member.id], { from: new Date(), status: "scheduled" }),
    link.scope === "records" ? getRecords([member.id]) : Promise.resolve([]),
  ]);
  const latest = latestByKind(vitals).get(member.id) ?? new Map();
  const adh = adherence(meds, logs, now, 30);
  const avg = (kind: VitalKind, ctxFilter?: string) => {
    const rows = vitals.filter((v) => v.kind === kind && (!ctxFilter || v.context === ctxFilter) && v.measuredAt.getTime() > Date.now() - 30 * 86_400_000);
    if (!rows.length) return null;
    const a = rows.reduce((s, v) => s + Number(v.value), 0) / rows.length;
    const b = rows.reduce((s, v) => s + Number(v.value2 ?? 0), 0) / rows.length;
    return { value: a, value2: kind === "bp" ? b : null, n: rows.length };
  };
  const bpAvg = avg("bp");
  const fastAvg = avg("sugar", "fasting");

  return (
    <Shell note={expires}>
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-6">
        <header className="space-y-2">
          <p className="text-sm font-medium text-muted-foreground">Health summary shared by the family · {link.label}</p>
          <h1 className="text-[2rem] leading-tight font-semibold">{member.name}</h1>
          <p className="text-lg">{[data.age != null ? `${data.age} years` : null, data.sex, data.bloodGroup ? `Blood group ${data.bloodGroup}` : null].filter(Boolean).join(" · ")}</p>
        </header>

        <section className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-xl border border-danger-border bg-danger-soft/60 p-5">
            <h2 className="text-sm font-bold tracking-wider text-danger uppercase">Allergies</h2>
            {data.allergies.length ? data.allergies.map((a) => <p key={a.name} className="mt-1 text-lg font-semibold">{a.name} <span className="text-base font-normal">({a.severity}{a.reaction ? `: ${a.reaction}` : ""})</span></p>) : <p className="mt-1 text-lg">No known allergies</p>}
          </div>
          <div className="rounded-xl border border-border bg-card p-5">
            <h2 className="text-sm font-bold tracking-wider uppercase">Conditions</h2>
            {data.conditions.length ? data.conditions.map((c) => <p key={c.name} className="mt-1 text-lg">{c.name}{c.since ? <span className="text-muted-foreground"> · since {c.since}</span> : null}</p>) : <p className="mt-1 text-lg">None recorded</p>}
          </div>
        </section>

        <section className="rounded-xl border border-border bg-card p-5">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="text-lg font-semibold">Current medicines</h2>
            <p className="text-[0.9375rem] text-muted-foreground">30-day adherence: <span className="font-semibold text-foreground">{adh.percent != null ? `${adh.percent}%` : "—"}</span> ({adh.taken} of {adh.due} doses)</p>
          </div>
          <table className="mt-3 w-full text-left text-[0.9375rem]">
            <thead className="text-sm text-muted-foreground"><tr><th className="py-2 font-medium">Medicine</th><th className="py-2 font-medium">Schedule</th><th className="hidden py-2 font-medium sm:table-cell">Prescribed by</th></tr></thead>
            <tbody className="divide-y divide-border">
              {meds.map((m) => (
                <tr key={m.id}>
                  <td className="py-2.5 pr-3"><span className="font-semibold">{m.name}</span> {m.strength}<span className="block text-sm text-muted-foreground">{m.genericName}</span></td>
                  <td className="py-2.5 pr-3">{m.times.map((t) => formatTime(t)).join(", ")}<span className="block text-sm text-muted-foreground">{m.instructions}</span></td>
                  <td className="hidden py-2.5 sm:table-cell">{m.prescribedBy ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <section className="rounded-xl border border-border bg-card p-5">
          <h2 className="text-lg font-semibold">Vitals</h2>
          <div className="mt-3 grid gap-3 sm:grid-cols-3">
            {(["bp", "sugar", "weight", "pulse", "spo2", "temperature"] as VitalKind[]).filter((k) => latest.has(k)).map((k) => {
              const v = latest.get(k)!;
              const c = classify(v);
              return (
                <div key={k} className="rounded-lg border border-border p-3.5">
                  <p className="text-sm text-muted-foreground">{VITAL_META[k].label} · latest</p>
                  <p className="text-xl font-semibold tabular">{formatReading(v)} <span className="text-sm font-normal text-muted-foreground">{VITAL_META[k].unit}</span></p>
                  <div className="mt-1 flex flex-wrap items-center gap-2">{k !== "weight" && <StatusBadge {...vitalTone(c.status)} label={c.label} size="sm" />}<span className="text-xs text-muted-foreground">{formatDate(v.measuredAt)}</span></div>
                </div>
              );
            })}
          </div>
          <p className="mt-3 text-[0.9375rem]">
            30-day averages:{" "}
            {bpAvg ? <span className="font-medium">BP {Math.round(bpAvg.value)}/{Math.round(bpAvg.value2 ?? 0)} ({bpAvg.n} readings)</span> : "BP —"}
            {" · "}
            {fastAvg ? <span className="font-medium">fasting sugar {Math.round(fastAvg.value)} mg/dL ({fastAvg.n} readings)</span> : "fasting sugar —"}
          </p>
          <SafetyNote className="mt-3">Values recorded by the family at home. Labels use general adult ranges. Not a diagnosis.</SafetyNote>
        </section>

        {appts.length > 0 && (
          <section className="rounded-xl border border-border bg-card p-5">
            <h2 className="text-lg font-semibold">Upcoming appointments</h2>
            <ul className="mt-2 divide-y divide-border">{appts.map((a) => <li key={a.id} className="py-2.5 text-[0.9375rem]"><span className="font-medium">{a.doctorName}</span> · {formatDateTime(a.startsAt)} · {a.reason ?? a.specialty}</li>)}</ul>
          </section>
        )}

        {link.scope === "records" && (
          <section className="rounded-xl border border-border bg-card p-5">
            <h2 className="text-lg font-semibold">Records</h2>
            <ul className="mt-2 divide-y divide-border">
              {recs.map((r) => (
                <li key={r.id} className="flex items-center justify-between gap-3 py-3">
                  <span><span className="block font-medium">{r.title}</span><span className="text-sm text-muted-foreground">{RECORD_TYPE_LABEL[r.type]} · {formatDate(r.recordDate)}{r.provider ? ` · ${r.provider}` : ""}</span></span>
                  {r.mimeType && <a href={`/share/${token}/file/${r.id}`} target="_blank" rel="noreferrer" className="inline-flex min-h-11 items-center gap-1.5 rounded-lg border border-border px-3 text-[0.9375rem] font-medium hover:bg-muted"><FileText className="size-4" aria-hidden="true" /> Open</a>}
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </Shell>
  );
}

function Shell({ children, note }: { children: React.ReactNode; note?: string }) {
  return (
    <div className="min-h-dvh bg-background">
      <header className="no-print border-b border-border bg-card">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <Link href="/" className="flex items-center gap-2 rounded-lg"><LogoMark className="size-8" /><span className="text-base font-semibold">Pulse</span></Link>
          {note && <p className="flex items-center gap-1.5 text-sm text-muted-foreground"><Clock className="size-4" aria-hidden="true" /> {note}</p>}
        </div>
      </header>
      <main className="px-4 py-8 sm:px-6">{children}</main>
      <footer className="no-print mx-auto flex max-w-5xl items-center gap-2 px-4 pb-8 text-sm text-muted-foreground sm:px-6">
        <Lock className="size-4" aria-hidden="true" /> Shared with consent through a private, time-limited link. Please don&apos;t forward it.
      </footer>
    </div>
  );
}
