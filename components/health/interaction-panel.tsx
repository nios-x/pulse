import { CircleCheck, ShieldAlert, TriangleAlert } from "lucide-react";
import { SafetyNote } from "@/components/health/safety-note";
import { StatusBadge } from "@/components/health/status-badge";
import type { DuplicateHit, InteractionHit } from "@/lib/drugs";
import { GENERIC_LABEL } from "@/lib/drugs";

const SEV = {
  major: { tone: "danger" as const, label: "Serious", icon: ShieldAlert },
  moderate: { tone: "warning" as const, label: "Check timing", icon: TriangleAlert },
  minor: { tone: "info" as const, label: "Minor", icon: TriangleAlert },
};

export function InteractionPanel({
  interactions,
  duplicates,
  memberName,
  count,
}: {
  interactions: InteractionHit[];
  duplicates: DuplicateHit[];
  memberName?: string;
  count: number;
}) {
  if (!interactions.length && !duplicates.length) {
    return (
      <div className="flex items-start gap-3 rounded-xl border border-success-border bg-success-soft/60 p-4">
        <CircleCheck className="mt-0.5 size-5 shrink-0 text-success" aria-hidden="true" />
        <div>
          <p className="text-base font-medium">No known clashes{memberName ? ` in ${memberName}'s medicines` : ""}</p>
          <p className="text-sm text-muted-foreground">Checked {count} active medicine{count === 1 ? "" : "s"} against our list of common interactions. Always tell your doctor about everything you take.</p>
        </div>
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-3">
      {interactions.map((i) => {
        const s = SEV[i.severity];
        return (
          <div key={`${i.first.id}-${i.second.id}-${i.a}-${i.b}`} className="rounded-xl border border-border bg-card p-4">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-base font-semibold">
                {i.first.name} + {i.second.name}
              </p>
              <StatusBadge tone={s.tone} icon={s.icon} label={s.label} size="sm" />
            </div>
            <p className="mt-1.5 text-[0.9375rem]">{i.effect}</p>
            <p className="mt-1 text-[0.9375rem] text-muted-foreground">
              <span className="font-medium text-foreground">What to do: </span>
              {i.advice}
            </p>
          </div>
        );
      })}
      {duplicates.map((d) => (
        <div key={d.generic} className="rounded-xl border border-border bg-card p-4">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-base font-semibold">Same medicine twice: {GENERIC_LABEL[d.generic]}</p>
            <StatusBadge tone="warning" label="Double dose risk" size="sm" />
          </div>
          <p className="mt-1.5 text-[0.9375rem]">
            {d.medicines.map((m) => m.name).join(" and ")} both contain {GENERIC_LABEL[d.generic].toLowerCase()}. Taking both can mean too much.
          </p>
        </div>
      ))}
      <SafetyNote>This checks common interactions only. Not a diagnosis. Consult a doctor or pharmacist before changing anything.</SafetyNote>
    </div>
  );
}
