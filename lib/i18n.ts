import en from "@/messages/en.json";
import hi from "@/messages/hi.json";

export const LOCALES = ["hi", "en"] as const;
export type Locale = (typeof LOCALES)[number];

// Hindi-first: anyone without a saved choice sees Hindi.
export const DEFAULT_LOCALE: Locale = "hi";
export const LOCALE_COOKIE = "pulse_lang";

export type MessageKey = keyof typeof en;
export type TranslateVars = Record<string, string | number>;
export type Translate = (key: MessageKey, vars?: TranslateVars) => string;

const dictionaries: Record<Locale, Partial<Record<MessageKey, string>>> = {
  en,
  hi,
};

export function isLocale(value: unknown): value is Locale {
  return typeof value === "string" && (LOCALES as readonly string[]).includes(value);
}

export function interpolate(text: string, vars?: TranslateVars): string {
  if (!vars) return text;
  return text.replace(/\{(\w+)\}/g, (match, name: string) =>
    name in vars ? String(vars[name]) : match
  );
}

/** Returns t(key, vars) for a locale. Missing Hindi strings fall back to English. */
export function createT(locale: Locale): Translate {
  const dict = dictionaries[locale];
  return (key, vars) => interpolate(dict[key] ?? en[key] ?? key, vars);
}
