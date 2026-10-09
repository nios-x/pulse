"use client";

import { useMemo, useState } from "react";
import { CartesianGrid, Line, LineChart, ReferenceArea, Tooltip, XAxis, YAxis } from "recharts";
import { Table2 } from "lucide-react";
import { StatusBadge, vitalTone } from "@/components/health/status-badge";
import { ChartContainer, type ChartConfig } from "@/components/ui/chart";
import type { VitalKind } from "@/db/schema";
import { classify, formatReading, SUGAR_CONTEXT_LABEL, VITAL_META } from "@/lib/vitals";
import { cn } from "@/lib/utils";

export type ChartPoint = { t: number; value: number; value2: number | null; context: string | null };

const RANGES = [
  { key: 7, label: "7 days" },
  { key: 30, label: "30 days" },
  { key: 90, label: "90 days" },
] as const;

/** Normal-range bands drawn behind the line. General adult ranges only. */
const BANDS: Partial<Record<VitalKind, { from: number; to: number; label: string; series: "value" | "value2" }[]>> = {
  bp: [
    { from: 90, to: 120, label: "Normal top number 90–120", series: "value" },
    { from: 60, to: 80, label: "Normal bottom number 60–80", series: "value2" },
  ],
  sugar: [{ from: 70, to: 140, label: "Usual range 70–140 mg/dL", series: "value" }],
  pulse: [{ from: 60, to: 100, label: "Usual range 60–100 bpm", series: "value" }],
  spo2: [{ from: 95, to: 100, label: "Usual range 95–100%", series: "value" }],
  temperature: [{ from: 97, to: 99, label: "Usual range 97–99 °F", series: "value" }],
};

const dayFmt = new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", timeZone: "Asia/Kolkata" });
const fullFmt = new Intl.DateTimeFormat("en-IN", { weekday: "short", day: "numeric", month: "short", hour: "numeric", minute: "2-digit", timeZone: "Asia/Kolkata" });

export function VitalChart({ kind, points, now }: { kind: VitalKind; points: ChartPoint[]; now: number }) {
  const [days, setDays] = useState<7 | 30 | 90>(30);
  const [asTable, setAsTable] = useState(false);
  const meta = VITAL_META[kind];
  const data = useMemo(() => points.filter((p) => p.t >= now - days * 86_400_000), [points, days, now]);
  const latest = points.at(-1);
  const latestClass = latest ? classify({ kind, value: latest.value, value2: latest.value2, context: latest.context }) : null;

  const config: ChartConfig = kind === "bp"
    ? { value: { label: "Top (systolic)", color: "var(--chart-1)" }, value2: { label: "Bottom (diastolic)", color: "var(--chart-2)" } }
    : { value: { label: meta.label, color: "var(--chart-1)" } };

  const values = data.flatMap((p) => [p.value, p.value2 ?? p.value]);
  const bands = BANDS[kind] ?? [];
  const lo = Math.min(...values, ...bands.map((b) => b.from));
  const hi = Math.max(...values, ...bands.map((b) => b.to));
  const pad = Math.max(2, (hi - lo) * 0.12);
  const domain: [number, number] = data.length ? [Math.floor(lo - pad), Math.ceil(hi + pad)] : [0, 1];

  const summary = latest
    ? `Latest ${meta.label.toLowerCase()}: ${formatReading({ kind, value: latest.value, value2: latest.value2 })} ${meta.unit}${latestClass && kind !== "weight" ? `, ${latestClass.label}` : ""}. ${data.length} readings in the last ${days} days.`
    : "No readings yet.";

  return (
    <section className="rounded-xl border border-border bg-card" aria-label={`${meta.label} chart`}>
      <div className="flex flex-wrap items-start justify-between gap-3 px-5 pt-5 sm:px-6">
        <div className="space-y-1.5">
          <h3 className="text-lg font-semibold">{meta.label}</h3>
          {latest && (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-2xl font-semibold tabular">
                {formatReading({ kind, value: latest.value, value2: latest.value2 })}
                <span className="ml-1 text-base font-normal text-muted-foreground">{meta.unit}</span>
              </span>
              {latestClass && kind !== "weight" && (
                <StatusBadge {...vitalTone(latestClass.status)} label={latestClass.label} />
              )}
              <span className="text-sm text-muted-foreground">{fullFmt.format(latest.t)}</span>
            </div>
          )}
        </div>
        <div className="flex items-center gap-1.5">
          <div role="radiogroup" aria-label="Time range" className="flex rounded-lg border border-border bg-surface p-0.5">
            {RANGES.map((r) => (
              <button
                key={r.key}
                type="button"
                role="radio"
                aria-checked={days === r.key}
                onClick={() => setDays(r.key)}
                className={cn(
                  "min-h-10 cursor-pointer rounded-md px-3 text-sm font-medium transition-colors duration-150",
                  days === r.key ? "bg-card text-foreground shadow-soft" : "text-muted-foreground hover:text-foreground"
                )}
              >
                {r.label}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={() => setAsTable((v) => !v)}
            aria-pressed={asTable}
            aria-label={asTable ? "Show as chart" : "Show as table"}
            className="flex size-11 cursor-pointer items-center justify-center rounded-lg text-muted-foreground hover:bg-muted aria-pressed:bg-muted aria-pressed:text-foreground"
          >
            <Table2 className="size-5" aria-hidden="true" />
          </button>
        </div>
      </div>

      <p className="sr-only">{summary}</p>

      <div className="px-2 pt-4 pb-3 sm:px-4">
        {data.length === 0 ? (
          <p className="px-4 py-14 text-center text-base text-muted-foreground">No {meta.label.toLowerCase()} readings in the last {days} days.</p>
        ) : asTable ? (
          <div className="max-h-72 overflow-y-auto px-3">
            <table className="w-full text-left text-[0.9375rem]">
              <thead className="sticky top-0 bg-card text-sm text-muted-foreground">
                <tr>
                  <th className="py-2 font-medium">When</th>
                  <th className="py-2 font-medium">Reading</th>
                  <th className="py-2 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {[...data].reverse().map((p) => {
                  const c = classify({ kind, value: p.value, value2: p.value2, context: p.context });
                  return (
                    <tr key={p.t}>
                      <td className="py-2.5 pr-3 text-muted-foreground">{fullFmt.format(p.t)}</td>
                      <td className="py-2.5 pr-3 font-medium tabular">
                        {formatReading({ kind, value: p.value, value2: p.value2 })} {meta.unit}
                        {p.context && <span className="ml-1.5 text-sm font-normal text-muted-foreground">{SUGAR_CONTEXT_LABEL[p.context]}</span>}
                      </td>
                      <td className="py-2.5">{kind === "weight" ? "—" : <StatusBadge {...vitalTone(c.status)} label={c.label} size="sm" />}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <ChartContainer config={config} className="aspect-auto h-64 w-full" aria-hidden="true">
            <LineChart data={data} margin={{ top: 8, right: 12, bottom: 0, left: -8 }}>
              <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="var(--border)" />
              {bands.map((b) => (
                <ReferenceArea key={b.label} y1={b.from} y2={b.to} fill="var(--chart-band)" stroke="none" ifOverflow="extendDomain" />
              ))}
              <XAxis
                dataKey="t"
                type="number"
                scale="time"
                domain={["dataMin", "dataMax"]}
                tickFormatter={(t: number) => dayFmt.format(t)}
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                minTickGap={28}
                fontSize={13}
              />
              <YAxis domain={domain} tickLine={false} axisLine={false} width={44} fontSize={13} allowDecimals={kind === "weight" || kind === "temperature"} />
              <Tooltip
                cursor={{ stroke: "var(--border-strong)" }}
                content={({ active, payload }) => {
                  if (!active || !payload?.length) return null;
                  const p = payload[0].payload as ChartPoint;
                  const c = classify({ kind, value: p.value, value2: p.value2, context: p.context });
                  return (
                    <div className="rounded-lg border border-border bg-popover px-3 py-2.5 text-sm shadow-pop">
                      <p className="text-muted-foreground">{fullFmt.format(p.t)}</p>
                      <p className="mt-0.5 text-base font-semibold tabular">
                        {formatReading({ kind, value: p.value, value2: p.value2 })} {meta.unit}
                      </p>
                      {p.context && <p className="text-muted-foreground">{SUGAR_CONTEXT_LABEL[p.context]}</p>}
                      {kind !== "weight" && <StatusBadge {...vitalTone(c.status)} label={c.label} size="sm" className="mt-1.5" />}
                    </div>
                  );
                }}
              />
              <Line dataKey="value" type="monotone" stroke="var(--color-value)" strokeWidth={2.25} dot={{ r: 2.5, fill: "var(--color-value)", strokeWidth: 0 }} activeDot={{ r: 5 }} isAnimationActive={false} />
              {kind === "bp" && (
                <Line dataKey="value2" type="monotone" stroke="var(--color-value2)" strokeWidth={2.25} dot={{ r: 2.5, fill: "var(--color-value2)", strokeWidth: 0 }} activeDot={{ r: 5 }} isAnimationActive={false} />
              )}
            </LineChart>
          </ChartContainer>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-border px-5 py-3 text-sm text-muted-foreground sm:px-6">
        {Object.entries(config).map(([key, c]) => (
          <span key={key} className="inline-flex items-center gap-2">
            <span className="h-0.5 w-4 rounded-full" style={{ background: c.color }} aria-hidden="true" />
            {c.label}
          </span>
        ))}
        {bands.length > 0 && (
          <span className="inline-flex items-center gap-2">
            <span className="size-3.5 rounded-sm bg-chart-band ring-1 ring-success-border" aria-hidden="true" />
            Shaded: usual range
          </span>
        )}
      </div>
    </section>
  );
}
