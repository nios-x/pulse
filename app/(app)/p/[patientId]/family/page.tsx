import { getT } from "@/lib/i18n-server";

export default async function Page() {
  const { t } = await getT();
  return (
    <>
      <h1 className="text-2xl font-semibold">{t("page.family")}</h1>
      <p className="mt-2 text-muted-foreground">{t("placeholder.soon")}</p>
    </>
  );
}
