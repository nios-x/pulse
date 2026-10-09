import { BadgeIndianRupee, CalendarClock, PillBottle, Stethoscope } from "lucide-react";
import { MedActions } from "@/components/health/med-actions";
import { MemberAvatar } from "@/components/health/member-avatar";
import { StatusBadge } from "@/components/health/status-badge";
import type { Medication } from "@/db/schema";
import { formatDate, formatTime, relativeDay } from "@/lib/dates";
import { genericAlternative } from "@/lib/drugs";
import { frequencyLabel, refillStatus } from "@/lib/meds";
import { cn } from "@/lib/utils";

export function MedicationCard({ med, member }: { med: Medication; member?: { name: string; tone: number } }) {
  const refill = refillStatus(med);
  const alt = med.active ? genericAlternative(med.name, med.times.length) : null;
  const ended = med.endDate != null;
  return (
    <article className={cn("flex flex-col gap-4 rounded-xl border border-border bg-card p-5", !med.active && "bg-surface/70")}>
      <div className="flex items-start gap-3">
        <span className={cn("flex size-11 shrink-0 items-center justify-center rounded-xl", med.active ? "bg-accent text-accent-foreground" : "bg-muted text-muted-foreground")}>
          <PillBottle className="size-5" aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="text-lg leading-snug font-semibold">
            {med.name} <span className="font-normal text-muted-foreground">{med.strength}</span>
          </h3>
          <p className="text-[0.9375rem] text-muted-foreground">
            {med.genericName ? `${med.genericName} · ` : ""}
            {med.form}
          </p>
        </div>
        <MedActions id={med.id} memberId={med.memberId} name={med.name} active={med.active} />
      </div>

      <div className="flex flex-wrap gap-2">
        {med.times.map((t) => (
          <span key={t} className="inline-flex h-8 items-center rounded-full bg-surface px-3 text-sm font-medium tabular">
            {formatTime(t)}
          </span>
        ))}
      </div>

      <dl className="grid gap-2 text-[0.9375rem]">
        <div className="flex gap-2">
          <dt className="sr-only">How often</dt>
          <CalendarClock className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
          <dd>
            {frequencyLabel(med.times)}
            {med.instructions && <span className="text-muted-foreground"> · {med.instructions}</span>}
            {ended && <span className="text-muted-foreground"> · until {formatDate(med.endDate!)} ({relativeDay(med.endDate!)})</span>}
          </dd>
        </div>
        {med.prescribedBy && (
          <div className="flex gap-2">
            <dt className="sr-only">Prescribed by</dt>
            <Stethoscope className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
            <dd className="text-muted-foreground">{med.prescribedBy}</dd>
          </div>
        )}
      </dl>

      <div className="mt-auto flex flex-wrap items-center justify-between gap-2 border-t border-border pt-4">
        {member ? (
          <span className="inline-flex items-center gap-2 text-sm font-medium">
            <MemberAvatar name={member.name} tone={member.tone} size="sm" className="size-6 text-[0.625rem]" />
            {member.name.split(" ")[0]}
          </span>
        ) : <span />}
        {!med.active ? (
          <StatusBadge tone="neutral" label="Stopped" size="sm" />
        ) : refill.status === "out" ? (
          <StatusBadge tone="danger" label="Out of stock" size="sm" />
        ) : refill.status === "soon" ? (
          <StatusBadge tone="warning" label="Refill soon" value={`${med.pillsLeft} left`} size="sm" />
        ) : refill.status === "ok" ? (
          <StatusBadge tone="success" label="In stock" value={`${refill.daysLeft} days`} size="sm" />
        ) : (
          <span className="text-sm text-muted-foreground">Stock not tracked</span>
        )}
      </div>

      {alt && alt.monthlySaving >= 30 && (
        <p className="-mt-1 flex items-start gap-2 text-sm text-muted-foreground" title={`Generic ${alt.genericName}: about ₹${alt.genericPrice} per 10 vs ₹${alt.brand.brandPrice}. Ask your doctor or pharmacist first.`}>
          <BadgeIndianRupee className="mt-0.5 size-4 shrink-0 text-success" aria-hidden="true" />
          <span>Generic could save <span className="font-semibold text-foreground">~₹{alt.monthlySaving}/month</span> · ask your pharmacist</span>
        </p>
      )}
    </article>
  );
}
