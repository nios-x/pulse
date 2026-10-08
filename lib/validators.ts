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
  // "doctor" makes an account that serves families instead of a health profile of its own.
  accountType: z.enum(["family", "doctor"]).catch("family"),
  clinic: z
    .string()
    .trim()
    .max(80, msg("auth.error.clinic"))
    .transform((s) => s || null),
});

/** Only same-site relative paths, so ?next= can't send people to another site. */
export const nextPathSchema = z
  .string()
  .regex(/^\/(?!\/)[\w\-/]*$/)
  .catch("/home");

// ---------- Phase 3: profiles, invites, members ----------

const uuidField = z.uuid();
const roleField = z.enum(["owner", "caregiver", "family", "doctor"]);
const scopeList = z.array(z.enum(["vitals", "meds", "meals", "mood"])).transform((s) => [...new Set(s)]);
const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .transform((s) => s || null);

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

export const mealSchema = z
  .object({
    patientId: uuidField,
    slot: z.enum(["breakfast", "lunch", "dinner", "snack"], msg("log.error.slot")),
    items: z.array(z.enum(FOOD_KEYS)).max(12),
    // Foods recognised from a photo (optional), kept so the timeline can say "rajma chawal".
    details: z.lazy(() => z.array(detectedFoodSchema).max(12)).optional(),
  })
  .refine((m) => m.items.length > 0 || (m.details?.length ?? 0) > 0, { ...msg("log.error.items"), path: ["items"] });

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

// ---------- Phase 6: safety net ----------

export const patientRefSchema = z.object({ patientId: uuidField });
export const alertRefSchema = z.object({ patientId: uuidField, alertId: uuidField });
const phqAnswer = z.number().int().min(0).max(3);
export const moodSchema = z.object({ patientId: uuidField, q1: phqAnswer, q2: phqAnswer });
export const followUpSchema = z.object({ patientId: uuidField, checkId: uuidField, answer: z.boolean() });

// ---------- Phase 8: doctor summary ----------

export const labSchema = z.object({
  patientId: uuidField,
  value: z.coerce
    .number(msg("share.error.hba1c"))
    .min(3, msg("share.error.hba1c"))
    .max(20, msg("share.error.hba1c"))
    .transform((v) => Math.round(v * 10) / 10),
  takenOn: z.iso.date(msg("share.error.date")),
});
export const shareLinkSchema = z.object({ patientId: uuidField, includeMood: z.boolean() });
export const shareLinkRefSchema = z.object({ patientId: uuidField, linkId: uuidField });
export const shareTokenSchema = z.string().regex(/^[A-Za-z0-9_-]{32}$/);

// ---------- Phase 9: profile settings ----------

const limit = (key: MessageKey) => z.coerce.number(msg(key)).int(msg(key));
export const limitsSchema = z
  .object({
    patientId: uuidField,
    glucoseLow: limit("settings.error.low").min(54, msg("settings.error.low")).max(120, msg("settings.error.low")),
    glucoseHigh: limit("settings.error.high").min(160, msg("settings.error.high")).max(400, msg("settings.error.high")),
  });
export const deletePatientSchema = z.object({
  patientId: uuidField,
  confirmName: z.string().trim(),
});

// ---------- Phase 10: push reminders ----------

export const pushSubscriptionSchema = z.object({
  endpoint: z.url({ protocol: /^https?$/ }).max(1000),
  keys: z.object({ p256dh: z.string().min(1).max(200), auth: z.string().min(1).max(100) }),
});
export const pushEndpointSchema = z.object({ endpoint: z.string().max(1000) });

// ---------- Phase 11: family calls ----------

export const callTicketSchema = z.object({ patientId: uuidField, targetUserId: uuidField });
export const callStartSchema = z.object({ patientId: uuidField, calleeId: uuidField, video: z.boolean() });
export const callEndSchema = z.object({ callId: uuidField });

// ---------- Meal photos (Gemini food recognition) ----------

/** A downscaled JPEG/PNG/WEBP from the phone camera, as a data URL (under the 1 MB action limit). */
export const mealPhotoSchema = z.object({
  patientId: uuidField,
  image: z
    .string()
    .max(950_000, msg("photo.error.tooBig"))
    .regex(/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/, msg("photo.error.failed")),
});

/** One food the AI saw. Also validates what we store in meals.details. */
export const detectedFoodSchema = z.object({
  key: z.enum([...FOOD_KEYS, "other"]),
  name_en: z.string().trim().min(1).max(60),
  name_hi: z.string().trim().min(1).max(60),
  portion: z.string().trim().max(40),
  carb: z.enum(["high", "medium", "low"]),
});

/** The AI's whole answer. It only names foods; there is nowhere for advice to go. */
export const foodDetectionSchema = z.object({
  is_food: z.boolean(),
  items: z.array(detectedFoodSchema).max(12),
});

// ---------- Booked doctor calls ----------

export const bookCallSchema = z.object({
  patientId: uuidField,
  doctorId: z.uuid(msg("booking.error.doctor")),
  memberId: z.uuid(msg("booking.error.member")),
  // <input type="datetime-local"> value, read as India time
  when: z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d+)?)?$/, msg("booking.error.when")),
  reason: optionalText(120),
});
export const bookingRefSchema = z.object({ patientId: uuidField, bookingId: uuidField });
export const respondBookingSchema = bookingRefSchema.extend({ accept: z.boolean() });
