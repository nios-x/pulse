import Link from "next/link";
import { ChevronRight, Droplet, TriangleAlert } from "lucide-react";
import { MemberAvatar } from "@/components/health/member-avatar";
import { RoleBadge } from "@/components/health/role-badge";
import { StatusBadge, vitalTone } from "@/components/health/status-badge";
import type { Member, Vital } from "@/db/schema";
import { ageFrom } from "@/lib/dates";
import { relationLabel } from "@/lib/labels";
import { classify, formatReading, VITAL_META } from "@/lib/vitals";
import { cn } from "@/lib/utils";

export function MemberCard({
  member,
  isMe,
  latest,
  doses,
  alertCount,
}: {
  member: Member;
  isMe: boolean;
  latest: Map<string, Vital> | undefined;
  doses: { taken: number; total: number };
  alertCount: number;
}) {
  const age = ageFrom(member.dateOfBirth);
  const severeAllergy = member.allergies.find((a) => a.severity === "severe");
  // Show the two readings that matter most for this person
  const kinds = (["bp", "sugar", "temperature", "weight"] as const).filter((k) => latest?.has(k)).slice(0, 2);
  const pct = doses.total ? Math.round((doses.taken / doses.total) * 100) : 0;

  return (
    <Link
      href={`/members/${member.id}`}
      className="group flex flex-col rounded-xl border border-border bg-card p-5 transition-[border-color,box-shadow] duration-150 hover:border-border-strong hover:shadow-pop focus-visible:outline-offset-2"
    >
      <div className="flex items-start gap-3.5">
        <MemberAvatar name={member.name} tone={member.avatarTone} size="lg" />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="truncate text-lg font-semibold">{member.name}</h3>
          </div>
          <p className="text-[0.9375rem] text-muted-foreground">
            {relationLabel(member.relation, member.sex, isMe)}
            {age != null && <> · {age} yrs</>}
          </p>
        </div>
        {member.bloodGroup && (
          <span className="inline-flex h-8 shrink-0 items-center gap-1 rounded-full border border-border bg-surface px-2.5 text-sm font-semibold tabular" title="Blood group">
            <Droplet className="size-3.5 text-muted-foreground" aria-hidden="true" />
            <span className="sr-only">Blood group </span>
            {member.bloodGroup}
          </span>
        )}
      </div>

      <dl className="mt-5 grid grid-cols-2 gap-3">
        {kinds.length === 0 && (
          <div className="col-span-2 rounded-lg bg-surface px-3 py-3 text-sm text-muted-foreground">No readings yet</div>
        )}
        {kinds.map((k) => {
          const v = latest!.get(k)!;
          const c = classify(v);
          const t = vitalTone(c.status);
          return (
            <div key={k} className="rounded-lg bg-surface px-3 py-2.5">
              <dt className="text-sm text-muted-foreground">{VITAL_META[k].short}</dt>
              <dd className="mt-1 flex flex-col gap-1.5">
                <span className="text-lg font-semibold tabular">
                  {formatReading(v)} <span className="text-sm font-normal text-muted-foreground">{VITAL_META[k].unit}</span>
                </span>
                {k !== "weight" && <StatusBadge tone={t.tone} icon={t.icon} label={c.label} size="sm" />}
              </dd>
            </div>
          );
        })}
      </dl>

      <div className="mt-4 space-y-1.5">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Today&apos;s medicines</span>
          <span className="font-medium tabular">{doses.total ? `${doses.taken} of ${doses.total} taken` : "None scheduled"}</span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-muted" role="progressbar" aria-label="Today's medicines taken" aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct}>
          <div className={cn("h-full rounded-full transition-[width] duration-200", pct === 100 ? "bg-success" : "bg-primary")} style={{ width: `${pct}%` }} />
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        {severeAllergy && <StatusBadge tone="warning" icon={TriangleAlert} label={`Allergy: ${severeAllergy.name}`} size="sm" />}
        {member.conditions.slice(0, severeAllergy ? 1 : 2).map((c) => (
          <span key={c.name} className="inline-flex h-6 items-center rounded-full bg-muted px-2 text-xs font-medium text-muted-foreground">
            {c.name}
          </span>
        ))}
      </div>

      <div className="mt-auto flex items-center justify-between gap-2 pt-5">
        <div className="flex items-center gap-2">
          {member.userId ? <RoleBadge role={member.role} size="sm" /> : <span className="text-xs text-muted-foreground">No login · managed by family</span>}
          {alertCount > 0 && (
            <span className="inline-flex h-6 items-center gap-1 rounded-full bg-warning-soft px-2 text-xs font-medium text-warning">
              <TriangleAlert className="size-3.5" aria-hidden="true" />
              {alertCount} alert{alertCount > 1 ? "s" : ""}
            </span>
          )}
        </div>
        <span className="inline-flex items-center gap-1 text-sm font-medium text-primary">
          Profile <ChevronRight className="size-4 transition-transform duration-150 group-hover:translate-x-0.5" aria-hidden="true" />
        </span>
      </div>
    </Link>
  );
}
