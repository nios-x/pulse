import type { TimelineRecord } from "@/components/health/record-timeline";
import type { ChartPoint } from "@/components/health/vital-chart";
import type { Vital } from "@/db/schema";
import type { RecordRow } from "@/lib/data";

export function toTimeline(r: RecordRow): TimelineRecord {
  const h = (r.extracted as { highlights?: unknown } | null)?.highlights;
  return {
    id: r.id,
    memberId: r.memberId,
    type: r.type,
    title: r.title,
    recordDate: r.recordDate,
    provider: r.provider,
    notes: r.notes,
    fileName: r.fileName,
    mimeType: r.mimeType,
    sizeBytes: r.sizeBytes,
    highlights: Array.isArray(h) ? h.filter((x): x is string => typeof x === "string").slice(0, 6) : [],
  };
}

export function toPoints(rows: Vital[]): ChartPoint[] {
  return rows.map((v) => ({ t: v.measuredAt.getTime(), value: Number(v.value), value2: v.value2 == null ? null : Number(v.value2), context: v.context }));
}
