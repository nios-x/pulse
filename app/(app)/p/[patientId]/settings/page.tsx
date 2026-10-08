import { DeletePatientForm, LimitsForm } from "@/components/settings/settings-forms";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getT } from "@/lib/i18n-server";
import { requirePermission } from "@/lib/permissions";
import { URGENT_HIGH, URGENT_LOW } from "@/lib/safety";

export default async function SettingsPage({ params }: PageProps<"/p/[patientId]/settings">) {
  const { patientId } = await params;
  const { permissions, patient } = await requirePermission(patientId, "edit_patient");
  const { t } = await getT();

  return (
    <div className="flex flex-col gap-5">
      <h1 className="text-2xl font-semibold">{t("settings.title")}</h1>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{t("settings.limitsTitle")}</CardTitle>
          <CardDescription>{t("settings.limitsHint", { urgentLow: URGENT_LOW, urgentHigh: URGENT_HIGH })}</CardDescription>
        </CardHeader>
        <CardContent>
          <LimitsForm patientId={patientId} low={patient.glucoseLow} high={patient.glucoseHigh} />
        </CardContent>
      </Card>

      {permissions.delete_patient ? (
        <Card className="ring-destructive/40">
          <CardHeader>
            <CardTitle className="text-lg text-destructive">{t("settings.deleteTitle")}</CardTitle>
            <CardDescription>{t("settings.deleteHint", { name: patient.name })}</CardDescription>
          </CardHeader>
          <CardContent>
            <DeletePatientForm patientId={patientId} name={patient.name} />
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
