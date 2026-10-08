import { BellOffIcon, HeartHandshakeIcon, TriangleAlertIcon } from "lucide-react";
import { AckButton } from "@/components/safety/ack-button";
import { CaregiverNotices } from "@/components/safety/caregiver-notices";
import { Badge } from "@/components/ui/badge";
import { listAlerts } from "@/lib/alerts";
import { formatDay, formatTime } from "@/lib/format";
import { istDate } from "@/lib/dates";
import { getT } from "@/lib/i18n-server";
import { now } from "@/lib/now";
import { requirePermission } from "@/lib/permissions";
import { safetyText, type AlertKind } from "@/lib/safety";
import { cn } from "@/lib/utils";

export default async function AlertsPage({ params }: PageProps<"/p/[patientId]/alerts">) {
  const { patientId } = await params;
  const { membership, patient } = await requirePermission(patientId, "receive_alerts");
  const { t, locale } = await getT();
  const current = await now();
  const rows = await listAlerts(patientId, membership.role);

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-semibold">{t("alerts.title")}</h1>

      {membership.role === "caregiver" ? <CaregiverNotices patient={patient} now={current} /> : null}

      {rows.length === 0 ? (
        <p className="flex flex-col items-center gap-2 rounded-xl border border-dashed px-4 py-8 text-center text-muted-foreground">
          <BellOffIcon className="size-8" aria-hidden />
          {t("alerts.empty")}
        </p>
      ) : (
        <ul className="flex flex-col gap-3">
          {rows.map((a) => {
            const urgent = a.severity === "urgent";
            const support = a.kind === "support_request";
            return (
              <li
                key={a.id}
                className={cn(
                  "flex flex-col gap-3 rounded-xl border p-4",
                  a.ackAt ? "bg-card" : urgent ? "border-destructive bg-destructive/10" : "border-warning bg-warning/15"
                )}
              >
                <div className="flex items-start gap-3">
                  {support ? (
                    <HeartHandshakeIcon className="mt-0.5 size-6 shrink-0 text-primary" aria-hidden />
                  ) : (
                    <TriangleAlertIcon
                      className={cn("mt-0.5 size-6 shrink-0", urgent ? "text-destructive" : "text-warning-foreground")}
                      aria-hidden
                    />
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      {a.mgdl ? <span className="text-2xl font-bold tabular-nums">{a.mgdl} mg/dL</span> : null}
                      <Badge variant={urgent ? "destructive" : "secondary"}>
                        {urgent ? t("alerts.urgent") : t("alerts.warning")}
                      </Badge>
                    </div>
                    <p className="mt-1 text-base">
                      {safetyText(a.kind as AlertKind, locale, { name: patient.name })}
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {istDate(a.createdAt) === istDate(current) ? "" : `${formatDay(istDate(a.createdAt), locale)}, `}
                      {formatTime(a.createdAt, locale)}
                      {a.loggedByName ? ` · ${t("alerts.loggedBy", { name: a.loggedByName })}` : ""}
                    </p>
                  </div>
                </div>
                {a.ackAt ? (
                  <p className="text-sm text-muted-foreground">
                    {t("alerts.seenBy", { name: a.ackByName ?? "", time: formatTime(a.ackAt, locale) })}
                  </p>
                ) : (
                  <AckButton patientId={patientId} alertId={a.id} />
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
