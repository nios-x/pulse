import { AppShell } from "@/components/shell/app-shell";
import { getT } from "@/lib/i18n-server";

export default async function HomePage() {
  const { t } = await getT();
  return (
    <AppShell patient={null}>
      <h1 className="text-2xl font-semibold">{t("page.home")}</h1>
      <p className="mt-2 text-muted-foreground">{t("placeholder.soon")}</p>
    </AppShell>
  );
}
