import Link from "next/link";
import { ShieldXIcon } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { getT } from "@/lib/i18n-server";

export default async function Forbidden() {
  const { t } = await getT();
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col items-start justify-center gap-4 px-4">
      <ShieldXIcon className="size-12 text-muted-foreground" aria-hidden />
      <h1 className="text-2xl font-semibold">{t("forbidden.title")}</h1>
      <p className="text-lg text-muted-foreground">{t("forbidden.body")}</p>
      <Link href="/home" className={buttonVariants({ size: "touch" })}>
        {t("forbidden.home")}
      </Link>
    </main>
  );
}
