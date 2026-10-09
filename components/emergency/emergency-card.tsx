import { Phone, Pill, TriangleAlert } from "lucide-react";
import type { Allergy, Condition, EmergencyContact } from "@/db/schema";
import { cn } from "@/lib/utils";

export type EmergencyData = {
  name: string;
  age: number | null;
  sex: string | null;
  bloodGroup: string | null;
  allergies: Allergy[];
  conditions: Condition[];
  medicines: { name: string; strength: string; times: string[] }[];
  contacts: EmergencyContact[];
  notes?: string | null;
  updated: string;
};

/**
 * Built to be read in three seconds by a stranger: blood group and allergies first,
 * very large type, maximum contrast, no colour-only meaning.
 */
export function EmergencyCard({ data, qr, className }: { data: EmergencyData; qr?: { svg: string; caption: string } | null; className?: string }) {
  const sex = data.sex ? data.sex[0].toUpperCase() + data.sex.slice(1) : null;
  return (
    <article aria-label={`Emergency medical card for ${data.name}`} className={cn("emergency-card overflow-hidden rounded-2xl border-2 border-emergency bg-card text-foreground print:rounded-none print:border-black", className)}>
      <header className="flex items-center justify-between gap-3 bg-emergency px-5 py-3 text-emergency-foreground sm:px-7">
        <p className="text-base font-bold tracking-[0.12em] uppercase sm:text-lg">Emergency medical info</p>
        <p className="text-sm font-semibold sm:text-base">Call 112 · Ambulance 108</p>
      </header>

      <div className="grid gap-6 p-5 sm:p-7 md:grid-cols-[1fr_auto]">
        <div className="flex flex-col gap-6">
          <div className="flex flex-wrap items-end gap-x-6 gap-y-3">
            <div className="min-w-0">
              <h2 className="text-[2rem] leading-tight font-bold sm:text-[2.5rem]">{data.name}</h2>
              <p className="text-lg font-medium sm:text-xl">{[data.age != null ? `${data.age} years` : null, sex].filter(Boolean).join(" · ")}</p>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-[auto_1fr]">
            <div className="flex min-w-36 flex-col items-center justify-center rounded-xl border-2 border-foreground px-5 py-3 text-center">
              <span className="text-sm font-bold tracking-wider uppercase">Blood group</span>
              <span className="text-[3.25rem] leading-none font-black tabular">{data.bloodGroup ?? "?"}</span>
            </div>
            <section className="rounded-xl border-2 border-emergency bg-danger-soft px-4 py-3">
              <h3 className="flex items-center gap-2 text-sm font-bold tracking-wider text-emergency uppercase">
                <TriangleAlert className="size-5" aria-hidden="true" /> Allergies
              </h3>
              {data.allergies.length === 0 ? (
                <p className="mt-1 text-xl font-semibold">No known allergies</p>
              ) : (
                <ul className="mt-1 space-y-1">
                  {data.allergies.map((a) => (
                    <li key={a.name} className="text-xl leading-snug font-bold sm:text-2xl">
                      {a.name.toUpperCase()}
                      <span className="ml-2 text-base font-semibold">({a.severity}{a.reaction ? `: ${a.reaction}` : ""})</span>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <section>
              <h3 className="text-sm font-bold tracking-wider uppercase">Conditions</h3>
              {data.conditions.length === 0 ? (
                <p className="mt-1 text-lg">None recorded</p>
              ) : (
                <ul className="mt-1 space-y-0.5 text-lg font-semibold">
                  {data.conditions.map((c) => <li key={c.name}>{c.name}</li>)}
                </ul>
              )}
            </section>
            <section>
              <h3 className="flex items-center gap-1.5 text-sm font-bold tracking-wider uppercase"><Pill className="size-4" aria-hidden="true" /> Current medicines</h3>
              {data.medicines.length === 0 ? (
                <p className="mt-1 text-lg">None</p>
              ) : (
                <ul className="mt-1 space-y-0.5 text-lg">
                  {data.medicines.map((m) => (
                    <li key={m.name + m.strength}><span className="font-semibold">{m.name}</span> {m.strength}</li>
                  ))}
                </ul>
              )}
            </section>
          </div>

          {data.notes && <p className="text-base">{data.notes}</p>}
        </div>

        {qr && (
          <div className="flex flex-col items-center gap-2 self-start md:w-44">
            <div className="w-40 rounded-lg border-2 border-foreground bg-white p-1.5" role="img" aria-label="QR code that opens this emergency card" dangerouslySetInnerHTML={{ __html: qr.svg }} />
            <p className="text-center text-sm font-medium">{qr.caption}</p>
          </div>
        )}
      </div>

      <section className="border-t-2 border-foreground/80 px-5 py-4 sm:px-7">
        <h3 className="text-sm font-bold tracking-wider uppercase">Emergency contacts</h3>
        {data.contacts.length === 0 ? (
          <p className="mt-1 text-lg">None added</p>
        ) : (
          <ul className="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {data.contacts.map((c) => (
              <li key={c.phone}>
                <a href={`tel:${c.phone.replace(/\s/g, "")}`} className="flex min-h-14 items-center gap-3 rounded-xl border-2 border-foreground/80 px-3 py-2 hover:bg-muted">
                  <Phone className="size-5 shrink-0" aria-hidden="true" />
                  <span className="min-w-0">
                    <span className="block text-lg leading-tight font-bold">{c.name}</span>
                    <span className="block text-base">{c.relation} · <span className="font-semibold tabular">{c.phone}</span></span>
                  </span>
                </a>
              </li>
            ))}
          </ul>
        )}
      </section>
      <footer className="border-t border-border px-5 py-2.5 text-sm text-muted-foreground sm:px-7">Kept by family on Pulse · updated {data.updated}</footer>
    </article>
  );
}
