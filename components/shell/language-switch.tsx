import { setLocale } from "@/app/actions/locale";
import { getT } from "@/lib/i18n-server";
import { LOCALES } from "@/lib/i18n";
import { cn } from "@/lib/utils";

/** Two big buttons, one per language. Works without JavaScript. */
export async function LanguageSwitch({ className }: { className?: string }) {
  const { t, locale } = await getT();
  return (
    <form action={setLocale} className={cn("flex flex-col gap-2", className)}>
      <p className="px-1 text-sm font-medium text-ink-3">{t("menu.language")}</p>
      <div className="grid grid-cols-2 gap-1 rounded-full bg-violet-wash p-1">
        {LOCALES.map((l) => (
          <button
            key={l}
            type="submit"
            name="locale"
            value={l}
            aria-pressed={l === locale}
            lang={l}
            className={cn(
              "h-11 rounded-full font-heading text-base font-medium transition-[background-color,color,box-shadow] duration-200",
              l === locale
                ? "bg-card font-semibold text-violet-deep shadow-[0_2px_8px_-2px_rgb(45_12_87/0.2)]"
                : "text-ink-2 hover:text-violet-deep"
            )}
          >
            {t(`lang.${l}`)}
          </button>
        ))}
      </div>
    </form>
  );
}
