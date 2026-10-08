import { cookies } from "next/headers";
import { cache } from "react";
import { createT, DEFAULT_LOCALE, isLocale, LOCALE_COOKIE, type Locale } from "@/lib/i18n";

export const getLocale = cache(async (): Promise<Locale> => {
  const value = (await cookies()).get(LOCALE_COOKIE)?.value;
  return isLocale(value) ? value : DEFAULT_LOCALE;
});

/** Server Component helper: const { t, locale } = await getT() */
export async function getT() {
  const locale = await getLocale();
  return { t: createT(locale), locale };
}
