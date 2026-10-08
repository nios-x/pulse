import { redirect } from "next/navigation";
import { HeartPulseIcon } from "lucide-react";
import { AuthForms } from "@/components/auth/auth-forms";
import { LanguageSwitch } from "@/components/shell/language-switch";
import { getCurrentUser } from "@/lib/auth";
import { getT } from "@/lib/i18n-server";
import { nextPathSchema } from "@/lib/validators";

export default async function AuthPage({ searchParams }: PageProps<"/auth">) {
  const params = await searchParams;
  const next = nextPathSchema.parse(params.next);
  if (await getCurrentUser()) redirect(next);

  const { t } = await getT();
  const defaultTab =
    params.tab === "signup" ? "signup" : params.tab === "forgot" ? "forgot" : "signin";

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col gap-6 px-4 py-8">
      <header className="flex flex-col items-start gap-3">
        <span className="flex size-12 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
          <HeartPulseIcon className="size-7" aria-hidden />
        </span>
        <div>
          <h1 className="text-3xl font-bold">{t("app.name")}</h1>
          <p className="text-lg text-muted-foreground">{t("app.tagline")}</p>
        </div>
      </header>
      <AuthForms next={next} defaultTab={defaultTab} />
      <LanguageSwitch className="mt-auto pt-4" />
    </main>
  );
}
