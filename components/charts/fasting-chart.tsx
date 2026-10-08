"use client";

import { CartesianGrid, Line, LineChart, ReferenceArea, XAxis, YAxis } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import { cn } from "@/lib/utils";

export type FastingPoint = { date: string; label: string; mgdl: number | null };

/**
 * Daily fasting sugar as one 2px line, with the patient's target range as a
 * light band behind it. One series, so no legend: the card title names it.
 */
export function FastingChart({
  data,
  low,
  high,
  seriesLabel,
  bandLabel,
  dense = false,
  className,
}: {
  data: FastingPoint[];
  low: number;
  high: number;
  seriesLabel: string;
  bandLabel: string;
  /** 90-day print view: no dots, no animation. */
  dense?: boolean;
  className?: string;
}) {
  const values = data.map((d) => d.mgdl).filter((v): v is number => v !== null);
  const top = Math.ceil(Math.max(200, ...values.map((v) => v + 30)) / 50) * 50;
  const bottom = Math.floor(Math.min(low - 20, ...values.map((v) => v - 20)) / 50) * 50;
  const ticks = Array.from({ length: (top - bottom) / 50 + 1 }, (_, i) => bottom + i * 50);
  const config = { mgdl: { label: seriesLabel, color: "var(--chart-1)" } } satisfies ChartConfig;

  return (
    <ChartContainer config={config} className={cn("aspect-auto h-56 w-full", className)}>
      <LineChart data={data} margin={{ top: 12, right: 8, bottom: 0, left: -12 }} accessibilityLayer>
        <CartesianGrid vertical={false} stroke="var(--border)" />
        <ReferenceArea
          y1={Math.max(low, bottom)}
          y2={Math.min(high, top)}
          fill="var(--success)"
          fillOpacity={0.12}
          ifOverflow="hidden"
          label={{ value: bandLabel, position: "insideTopLeft", fill: "var(--muted-foreground)", fontSize: 11 }}
        />
        <XAxis
          dataKey="label"
          tickLine={false}
          axisLine={false}
          tickMargin={6}
          minTickGap={24}
          interval="preserveStartEnd"
        />
        <YAxis domain={[bottom, top]} ticks={ticks} tickLine={false} axisLine={false} width={44} />
        <ChartTooltip cursor content={<ChartTooltipContent indicator="line" />} />
        <Line
          dataKey="mgdl"
          type="monotone"
          stroke="var(--color-mgdl)"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          connectNulls
          isAnimationActive={!dense}
          dot={dense ? false : { r: 4, fill: "var(--color-mgdl)", stroke: "var(--card)", strokeWidth: 2 }}
          activeDot={{ r: 6, stroke: "var(--card)", strokeWidth: 2 }}
        />
      </LineChart>
    </ChartContainer>
  );
}
