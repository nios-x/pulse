"use client";

import { CartesianGrid, Line, LineChart, ReferenceArea, XAxis, YAxis } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import { cn } from "@/lib/utils";

export type VitalPoint = { date: string; label: string } & Record<string, number | string | null>;
export type VitalSeries = { key: string; label: string; color: string; dashed?: boolean };
export type VitalBand = { from: number; to: number; label?: string };

/**
 * A reading over time: 2px lines, the usual healthy range as a soft green band
 * behind them, and a table for screen readers. Colour never carries meaning on
 * its own: the card around it names the status in words.
 */
export function VitalChart({
  data,
  series,
  bands = [],
  unit,
  caption,
  domain,
  className,
}: {
  data: VitalPoint[];
  series: VitalSeries[];
  bands?: VitalBand[];
  unit: string;
  caption: string;
  domain?: [number, number];
  className?: string;
}) {
  const values = data.flatMap((d) => series.map((s) => d[s.key])).filter((v): v is number => typeof v === "number");
  const lo = Math.min(...values, ...bands.map((b) => b.from));
  const hi = Math.max(...values, ...bands.map((b) => b.to));
  const pad = Math.max(2, (hi - lo) * 0.12);
  const [bottom, top] = domain ?? [Math.floor(lo - pad), Math.ceil(hi + pad)];
  const config = Object.fromEntries(series.map((s) => [s.key, { label: s.label, color: s.color }])) satisfies ChartConfig;

  return (
    <div className={className}>
      <ChartContainer config={config} className={cn("aspect-auto h-60 w-full")}>
        <LineChart data={data} margin={{ top: 10, right: 10, bottom: 0, left: -14 }} accessibilityLayer>
          <CartesianGrid vertical={false} stroke="var(--edge)" strokeDasharray="2 4" />
          {bands.map((b, i) => (
            <ReferenceArea
              key={i}
              y1={Math.max(b.from, bottom)}
              y2={Math.min(b.to, top)}
              fill="var(--ok)"
              fillOpacity={0.09}
              stroke="var(--ok)"
              strokeOpacity={0.18}
              strokeDasharray="3 3"
              ifOverflow="hidden"
              label={b.label ? { value: b.label, position: "insideTopLeft", fill: "var(--ok-ink)", fontSize: 12 } : undefined}
            />
          ))}
          <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={8} minTickGap={28} interval="preserveStartEnd" tick={{ fill: "var(--ink-3)", fontSize: 13 }} />
          <YAxis domain={[bottom, top]} tickLine={false} axisLine={false} width={48} tick={{ fill: "var(--ink-3)", fontSize: 13 }} />
          <ChartTooltip cursor={{ stroke: "var(--edge-strong)" }} content={<ChartTooltipContent indicator="line" />} />
          {series.map((s) => (
            <Line
              key={s.key}
              dataKey={s.key}
              type="monotone"
              stroke={`var(--color-${s.key})`}
              strokeWidth={2.25}
              strokeDasharray={s.dashed ? "6 4" : undefined}
              strokeLinecap="round"
              connectNulls
              animationDuration={500}
              dot={{ r: 3.5, fill: "var(--card)", stroke: `var(--color-${s.key})`, strokeWidth: 2 }}
              activeDot={{ r: 6, fill: `var(--color-${s.key})`, stroke: "var(--card)", strokeWidth: 2 }}
            />
          ))}
        </LineChart>
      </ChartContainer>
      <table className="sr-only">
        <caption>{caption}</caption>
        <thead>
          <tr>
            <th scope="col">Date</th>
            {series.map((s) => (
              <th key={s.key} scope="col">
                {s.label} ({unit})
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((d) => (
            <tr key={d.date}>
              <th scope="row">{d.label}</th>
              {series.map((s) => (
                <td key={s.key}>{d[s.key] ?? "–"}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
