import { z } from "zod";
import { FOOD_KEYS } from "@/lib/foods";
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

// ---------- Phase 3: profiles, invites, members ----------

const uuidField = z.uuid();
const roleField = z.enum(["owner", "caregiver", "family"]);
const scopeList = z.array(z.enum(["vitals", "meds", "meals", "mood"])).transform((s) => [...new Set(s)]);
const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .transform((s) => s || null);

export const createPatientSchema = z.object({
  name: z.string().trim().min(1, msg("profile.error.name")).max(80, msg("profile.error.name")),
  forWhom: z.enum(["me", "family"], msg("profile.error.forWhom")),
  birthYear: z
    .string()
    .trim()
    .refine((s) => s === "" || (/^\d{4}$/.test(s) && +s >= 1900 && +s <= new Date().getFullYear()), msg("profile.error.birthYear"))
    .transform((s) => (s ? Number(s) : null)),
  city: optionalText(60),
});

export const inviteSchema = z.object({
  patientId: uuidField,
  role: roleField,
  scopes: scopeList,
});

/** 6 characters, any case, spaces ignored. */
export const inviteCodeSchema = z
  .string()
  .transform((s) => s.replace(/\s/g, "").toUpperCase())
  .pipe(z.string().regex(/^[A-Z0-9]{6}$/, msg("join.error.code")));

export const memberRefSchema = z.object({ patientId: uuidField, membershipId: uuidField });
export const memberRoleSchema = memberRefSchema.extend({ role: z.enum(["caregiver", "family"]) });
export const memberScopesSchema = memberRefSchema.extend({ scopes: scopeList });
export const inviteRefSchema = z.object({ patientId: uuidField, inviteId: uuidField });

// ---------- Phase 4: daily log ----------

export const GLUCOSE_MIN = 20;
export const GLUCOSE_MAX = 600;

export const glucoseSchema = z.object({
  patientId: uuidField,
  mgdl: z.coerce
    .number(msg("log.error.mgdl"))
    .int(msg("log.error.mgdl"))
    .min(GLUCOSE_MIN, msg("log.error.mgdl"))
    .max(GLUCOSE_MAX, msg("log.error.mgdl")),
  context: z.enum(["fasting", "after_meal", "random"], msg("log.error.context")),
});

export const mealSchema = z.object({
  patientId: uuidField,
  slot: z.enum(["breakfast", "lunch", "dinner", "snack"], msg("log.error.slot")),
  items: z.array(z.enum(FOOD_KEYS)).min(1, msg("log.error.items")).max(12),
});

export const checkinSchema = z.object({
  patientId: uuidField,
  walked: z.boolean().optional(),
  sleep: z.union([z.literal(1), z.literal(2), z.literal(3)]).optional(),
});

// ---------- Phase 5: medicines ----------

const timeField = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, msg("meds.error.times"));

export const medicationSchema = z.object({
  patientId: uuidField,
  name: z.string().trim().min(1, msg("meds.error.name")).max(60, msg("meds.error.name")),
  dose: z.string().trim().max(40, msg("meds.error.dose")),
  times: z
    .array(timeField)
    .transform((t) => [...new Set(t)].sort())
    .pipe(z.array(z.string()).min(1, msg("meds.error.times")).max(6, msg("meds.error.times"))),
});

export const medicationUpdateSchema = medicationSchema.extend({ medicationId: uuidField });
export const medicationRefSchema = z.object({ patientId: uuidField, medicationId: uuidField });
export const doseSchema = medicationRefSchema.extend({ slot: timeField, taken: z.boolean() });
