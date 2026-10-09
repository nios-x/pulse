"use client";

import { useState } from "react";
import { Area, CartesianGrid, ComposedChart, Line, ReferenceArea, ReferenceLine, Tooltip, XAxis, YAxis } from "recharts";
import { ArrowDownRight, ArrowUpRight, Minus, Sparkles } from "lucide-react";
import { ChartContainer } from "@/components/ui/chart";
import type { WeekScore } from "@/lib/health-score";
import { cn } from "@/lib/utils";

type Metric = "score" | "bpSys" | "sugarFasting" | "weight" | "adherence";

const METRICS: { key: Metric; label: string; unit: string; better: "up" | "down"; color: string }[] = [
  { key: "score", label: "Health score", unit: "/100", better: "up", color: "var(--brand)" },
  { key: "adherence", label: "Medicines taken", unit: "%", better: "up", color: "var(--chart-2)" },
  { key: "bpSys", label: "BP (top number)", unit: "mmHg", better: "down", color: "var(--chart-3)" },
  { key: "sugarFasting", label: "Fasting sugar", unit: "mg/dL", better: "down", color: "var(--chart-4)" },
  { key: "weight", label: "Weight", unit: "kg", better: "down", color: "var(--primary)" },
];

export type Improvement = { before: number; after: number; change: number } | null;

export function ProgressChart({ weeks, planLabel, improvements }: { weeks: WeekScore[]; planLabel: string | null; improvements: Partial<Record<Metric, Improvement>> }) {
  const available = METRICS.filter((m) => weeks.some((w) => w[m.key] != null));
  const [metric, setMetric] = useState<Metric>(available[0]?.key ?? "score");
  const m = METRICS.find((x) => x.key === metric)!;
  const data = weeks.map((w) => ({ label: w.label, value: w[metric], after: w.afterPlan }));
  const values = data.map((d) => d.value).filter((v): v is number => v != null);
  const lo = Math.min(...values);
  const hi = Math.max(...values);
  const pad = Math.max(2, (hi - lo) * 0.25);
  const domain: [number, number] = metric === "score" || metric === "adherence" ? [Math.max(0, Math.floor(lo - pad)), 100] : [Math.floor(lo - pad), Math.ceil(hi + pad)];
  const planWeek = weeks.find((w) => w.afterPlan)?.label ?? null;
  const lastLabel = weeks.at(-1)?.label;
  const imp = improvements[metric];

  return (
    <div className="flex flex-col gap-5">
      <div role="radiogroup" aria-label="What to show" className="scrollbar-none -mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
        {available.map((x) => (
          <button
            key={x.key}
            type="button"
            role="radio"
            aria-checked={metric === x.key}
            onClick={() => setMetric(x.key)}
            className={cn("min-h-10 shrink-0 cursor-pointer rounded-full border px-4 text-sm font-semibold transition-colors", metric === x.key ? "border-brand bg-brand text-brand-foreground" : "border-border bg-card hover:bg-muted")}
          >
            {x.label}
          </button>
        ))}
      </div>

      {imp && (
        <div className="grid grid-cols-3 gap-3">
          <Stat label="Before plan" value={`${imp.before}`} unit={m.unit} />
          <Stat label="Since plan" value={`${imp.after}`} unit={m.unit} highlight />
          <ChangeStat change={imp.change} unit={m.unit} better={m.better} />
        </div>
      )}

      <p className="sr-only">
        {m.label} by week. {imp ? `Average before the plan ${imp.before}${m.unit}, since the plan ${imp.after}${m.unit}.` : ""}
      </p>

      {values.length === 0 ? (
        <p className="py-12 text-center text-base text-muted-foreground">Not enough data yet. Keep logging and your trend appears here.</p>
      ) : (
        <ChartContainer config={{ value: { label: m.label, color: m.color } }} className="aspect-auto h-72 w-full" aria-hidden="true">
          <ComposedChart data={data} margin={{ top: 24, right: 12, bottom: 0, left: -10 }}>
            <defs>
              <linearGradient id="progressFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={m.color} stopOpacity={0.28} />
                <stop offset="100%" stopColor={m.color} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="var(--border)" />
            {planWeek && lastLabel && <ReferenceArea x1={planWeek} x2={lastLabel} fill="var(--chart-band)" stroke="none" />}
            {planWeek && (
              <ReferenceLine
                x={planWeek}
                stroke="var(--primary)"
                strokeDasharray="5 4"
                strokeWidth={2}
                label={{ value: planLabel ?? "Plan started", position: "top", fill: "var(--primary)", fontSize: 12, fontWeight: 700 }}
              />
            )}
            <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={8} fontSize={12} minTickGap={16} />
            <YAxis domain={domain} tickLine={false} axisLine={false} width={44} fontSize={12} />
            <Tooltip
              cursor={{ stroke: "var(--border-strong)" }}
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null;
                const p = payload[0].payload as { label: string; value: number | null; after: boolean };
                return (
                  <div className="rounded-xl border border-border bg-popover px-3 py-2.5 text-sm shadow-pop">
                    <p className="text-muted-foreground">Week of {p.label}</p>
                    <p className="text-base font-bold tabular">{p.value ?? "—"} <span className="text-sm font-normal text-muted-foreground">{m.unit}</span></p>
                    <p className="text-xs text-muted-foreground">{p.after ? "On the plan" : "Before the plan"}</p>
                  </div>
                );
              }}
            />
            <Area dataKey="value" type="monotone" stroke="none" fill="url(#progressFill)" connectNulls isAnimationActive={false} />
            <Line dataKey="value" type="monotone" stroke={m.color} strokeWidth={3} dot={{ r: 4, fill: "var(--card)", stroke: m.color, strokeWidth: 2.5 }} activeDot={{ r: 6 }} connectNulls isAnimationActive={false} />
          </ComposedChart>
        </ChartContainer>
      )}
    </div>
  );
}

function Stat({ label, value, unit, highlight }: { label: string; value: string; unit: string; highlight?: boolean }) {
  return (
    <div className={cn("rounded-2xl p-3.5", highlight ? "bg-brand-soft" : "bg-surface")}>
      <p className="text-xs font-medium text-muted-foreground sm:text-sm">{label}</p>
      <p className="font-heading text-xl font-extrabold tabular sm:text-2xl">{value}<span className="ml-1 text-xs font-medium text-muted-foreground sm:text-sm">{unit}</span></p>
    </div>
  );
}

function ChangeStat({ change, unit, better }: { change: number; unit: string; better: "up" | "down" }) {
  const good = better === "up" ? change > 0 : change < 0;
  const flat = Math.abs(change) < 0.5;
  const Icon = flat ? Minus : change > 0 ? ArrowUpRight : ArrowDownRight;
  return (
    <div className={cn("rounded-2xl p-3.5", flat ? "bg-surface" : good ? "bg-success-soft" : "bg-warning-soft")}>
      <p className="flex items-center gap-1 text-xs font-medium text-muted-foreground sm:text-sm">
        {good && !flat && <Sparkles className="size-3.5 text-success" aria-hidden="true" />} Change
      </p>
      <p className={cn("flex items-center gap-1 font-heading text-xl font-extrabold tabular sm:text-2xl", flat ? "" : good ? "text-success" : "text-warning")}>
        <Icon className="size-5" aria-hidden="true" />
        {change > 0 ? "+" : ""}
        {change}
        <span className="text-xs font-medium sm:text-sm">{unit}</span>
      </p>
      <p className="sr-only">{flat ? "About the same" : good ? "Improved" : "Needs attention"}</p>
    </div>
  );
}
