import { setLocale } from "@/app/actions/locale";
import { getT } from "@/lib/i18n-server";
import { LOCALES } from "@/lib/i18n";
import { cn } from "@/lib/utils";

/** Two big buttons, one per language. Works without JavaScript. */
export async function LanguageSwitch({ className }: { className?: string }) {
  const { t, locale } = await getT();
  return (
    <form action={setLocale} className={cn("flex flex-col gap-2", className)}>
      <p className="text-sm font-medium text-muted-foreground">{t("menu.language")}</p>
      <div className="grid grid-cols-2 gap-2">
        {LOCALES.map((l) => (
          <button
            key={l}
            type="submit"
            name="locale"
            value={l}
            aria-pressed={l === locale}
            lang={l}
            className={cn(
              "h-11 rounded-lg border text-base font-medium transition-colors",
              l === locale
                ? "border-primary bg-primary text-primary-foreground"
                : "bg-card hover:bg-muted"
            )}
          >
            {t(`lang.${l}`)}
          </button>
        ))}
      </div>
    </form>
  );
}
