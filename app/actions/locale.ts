"use server";

import { cookies } from "next/headers";
import { refresh } from "next/cache";
import { LOCALE_COOKIE } from "@/lib/i18n";
import { localeSchema } from "@/lib/validators";

export async function setLocale(formData: FormData) {
  const parsed = localeSchema.safeParse({ locale: formData.get("locale") });
  if (!parsed.success) return;
  (await cookies()).set(LOCALE_COOKIE, parsed.data.locale, {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
  });
  refresh();
}
