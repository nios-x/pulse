"use client";

import { createContext, use, useMemo, type ReactNode } from "react";
import { createT, DEFAULT_LOCALE, type Locale, type Translate } from "@/lib/i18n";

const LocaleContext = createContext<Locale>(DEFAULT_LOCALE);

export function I18nProvider({ locale, children }: { locale: Locale; children: ReactNode }) {
  return <LocaleContext value={locale}>{children}</LocaleContext>;
}

export function useLocale(): Locale {
  return use(LocaleContext);
}

/** Client Component helper: const t = useT() */
export function useT(): Translate {
  const locale = useLocale();
  return useMemo(() => createT(locale), [locale]);
}
