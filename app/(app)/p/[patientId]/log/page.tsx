import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { dailyCheckins } from "@/db/schema";
import { DayCard } from "@/components/log/day-card";
import { MealCard } from "@/components/log/meal-card";
import { SugarCard } from "@/components/log/sugar-card";
import { istDate, istMinutes } from "@/lib/dates";
import { slotForTime } from "@/lib/foods";
import { foodPhotoEnabled } from "@/lib/gemini";
import { getT } from "@/lib/i18n-server";
import { now } from "@/lib/now";
import { requirePermission } from "@/lib/permissions";

export default async function LogPage({ params }: PageProps<"/p/[patientId]/log">) {
  const { patientId } = await params;
  const { permissions } = await requirePermission(patientId, "view_summary");
  const { t } = await getT();
  const current = await now();
  const minutes = istMinutes(current);

  const [checkin] = permissions.log_checkin
    ? await db
        .select({ walked: dailyCheckins.walked, sleep: dailyCheckins.sleep })
        .from(dailyCheckins)
        .where(and(eq(dailyCheckins.patientId, patientId), eq(dailyCheckins.date, istDate(current))))
        .limit(1)
    : [];

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-semibold">{t("page.log")}</h1>
      {/* Each card renders only if this member's role allows it. */}
      {permissions.log_glucose ? (
        <SugarCard patientId={patientId} defaultContext={minutes < 10 * 60 ? "fasting" : "after_meal"} />
      ) : null}
      {permissions.log_meals ? <MealCard patientId={patientId} defaultSlot={slotForTime(minutes)} photoEnabled={foodPhotoEnabled()} /> : null}
      {permissions.log_checkin ? (
        <DayCard patientId={patientId} walked={checkin?.walked ?? null} sleep={checkin?.sleep ?? null} />
      ) : null}
      {!permissions.log_glucose && !permissions.log_meals && !permissions.log_checkin ? (
        <p className="rounded-xl border border-dashed px-4 py-6 text-center text-muted-foreground">{t("log.viewOnly")}</p>
      ) : null}
    </div>
  );
}
