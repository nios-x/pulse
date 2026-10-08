import { z } from "zod";
import { LOCALES, type MessageKey } from "@/lib/i18n";

// Every error message is an i18n key, so the form can show it with t().
const msg = (key: MessageKey) => ({ error: key });

/** Result returned by form Server Actions and read by useActionState. */
export type FormState = {
  ok?: boolean;
  error?: MessageKey;
  fieldErrors?: Partial<Record<string, MessageKey>>;
  values?: Record<string, string>;
};

/** Reads text fields from FormData; missing fields become "". */
export function readForm<K extends string>(formData: FormData, keys: readonly K[]): Record<K, string> {
  const out = {} as Record<K, string>;
  for (const key of keys) {
    const value = formData.get(key);
    out[key] = typeof value === "string" ? value : "";
  }
  return out;
}

export function toFieldErrors(error: z.ZodError): Partial<Record<string, MessageKey>> {
  const out: Partial<Record<string, MessageKey>> = {};
  for (const issue of error.issues) {
    const field = String(issue.path[0] ?? "form");
    out[field] ??= issue.message as MessageKey;
  }
  return out;
}

// ---------- Phase 0: language ----------

export const localeSchema = z.object({ locale: z.enum(LOCALES) });

// ---------- Phase 1: login ----------

const emailField = z
  .string(msg("auth.error.email"))
  .trim()
  .toLowerCase()
  .pipe(z.email(msg("auth.error.email")));

const phoneField = z
  .string()
  .trim()
  .transform((s) => s.replace(/[\s()-]/g, ""))
  .refine((s) => s === "" || /^\+?\d{10,13}$/.test(s), msg("auth.error.phone"))
  .transform((s) => s || null);

export const signInSchema = z.object({
  email: emailField,
  password: z.string().min(1, msg("auth.error.passwordRequired")).max(200),
});

export const signUpSchema = z.object({
  name: z.string().trim().min(1, msg("auth.error.name")).max(80, msg("auth.error.name")),
  email: emailField,
  password: z
    .string()
    .min(8, msg("auth.error.passwordLength"))
    .max(200, msg("auth.error.passwordLength")),
  phone: phoneField,
});

/** Only same-site relative paths, so ?next= can't send people to another site. */
export const nextPathSchema = z
  .string()
  .regex(/^\/(?!\/)[\w\-/]*$/)
  .catch("/home");
