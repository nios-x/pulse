import { AppShell } from "@/components/shell/app-shell";
import { CreatePatientForm } from "@/components/profile/create-patient-form";
import { requireUser } from "@/lib/auth";
import { getT } from "@/lib/i18n-server";

export default async function NewProfilePage() {
  await requireUser();
  const { t } = await getT();
  return (
    <AppShell patient={null}>
      <h1 className="mb-1 text-2xl font-semibold">{t("profile.title")}</h1>
      <p className="mb-5 text-muted-foreground">{t("profile.subtitle")}</p>
      <CreatePatientForm />
    </AppShell>
  );
}
