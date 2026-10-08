import { AppShell } from "@/components/shell/app-shell";
import { requireUser } from "@/lib/auth";
import { getT } from "@/lib/i18n-server";

export default async function HomePage() {
  const user = await requireUser();
  const { t } = await getT();
  return (
    <AppShell patient={null}>
      <h1 className="text-2xl font-semibold">{t("home.welcome", { name: user.name })}</h1>
      <p className="mt-2 text-muted-foreground">{t("placeholder.soon")}</p>
    </AppShell>
  );
}
