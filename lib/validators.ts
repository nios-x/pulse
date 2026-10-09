import { z } from "zod";
import { BLOOD_GROUPS } from "@/lib/labels";

const time = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Use a time like 08:30");
const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Pick a date");
/** "" or missing → null; otherwise a number within bounds. */
const optionalNumber = (min: number, max: number, int = false) =>
  z.preprocess(
    (v) => (v === "" || v == null ? null : v),
    (int ? z.coerce.number().int() : z.coerce.number()).min(min, `Must be at least ${min}`).max(max, `Must be at most ${max}`).nullable()
  );

const optionalText = (max = 200) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((v) => (v ? v : null));

export const signUpSchema = z.object({
  name: z.string().trim().min(2, "Please enter your name").max(80),
  email: z.string().trim().toLowerCase().email("Enter a valid email address"),
  password: z.string().min(8, "Use at least 8 characters").max(100),
  consent: z.literal("on", { message: "Please agree to continue" }),
  invite: z.string().trim().toUpperCase().optional(),
});

export const signInSchema = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email address"),
  password: z.string().min(1, "Enter your password"),
});

export const doseSchema = z.object({
  medicationId: z.string().uuid(),
  date,
  time,
  status: z.enum(["taken", "skipped", "undo"]),
});

export const medicationSchema = z.object({
  id: z.string().uuid().optional(),
  memberId: z.string().uuid("Choose who this medicine is for"),
  name: z.string().trim().min(2, "Enter the medicine name").max(80),
  genericName: optionalText(80),
  strength: z.string().trim().max(40).default(""),
  form: z.string().trim().max(30).default("tablet"),
  instructions: optionalText(120),
  times: z.array(time).min(1, "Add at least one time").max(6),
  startDate: date,
  endDate: z
    .string()
    .optional()
    .transform((v) => (v ? v : null))
    .pipe(date.nullable()),
  pillsLeft: optionalNumber(0, 5000, true).optional(),
  refillAt: z.coerce.number().int().min(0).max(500).default(7),
  prescribedBy: optionalText(80),
});

export const vitalSchema = z
  .object({
    memberId: z.string().uuid(),
    kind: z.enum(["bp", "sugar", "weight", "pulse", "spo2", "temperature"]),
    value: z.coerce.number().positive("Enter a number"),
    value2: optionalNumber(1, 400).optional(),
    context: z.enum(["fasting", "after_meal", "random"]).optional().nullable(),
    note: optionalText(200),
  })
  .superRefine((v, ctx) => {
    const ranges: Record<string, [number, number]> = {
      bp: [50, 260],
      sugar: [20, 700],
      weight: [1, 300],
      pulse: [20, 250],
      spo2: [50, 100],
      temperature: [90, 110],
    };
    const [lo, hi] = ranges[v.kind];
    if (v.value < lo || v.value > hi) ctx.addIssue({ code: "custom", path: ["value"], message: `That looks unusual. Expected ${lo}–${hi}.` });
    if (v.kind === "bp") {
      if (!v.value2) ctx.addIssue({ code: "custom", path: ["value2"], message: "Enter the lower number" });
      else if (v.value2 < 30 || v.value2 > 160 || v.value2 >= v.value)
        ctx.addIssue({ code: "custom", path: ["value2"], message: "The lower number should be smaller than the top one" });
    }
  });

export const appointmentSchema = z.object({
  id: z.string().uuid().optional(),
  memberId: z.string().uuid("Choose who the appointment is for"),
  doctorId: z.string().uuid().optional().nullable(),
  doctorName: z.string().trim().min(2, "Enter the doctor or clinic").max(80),
  specialty: optionalText(80),
  location: optionalText(160),
  date,
  time,
  durationMin: z.coerce.number().int().min(5).max(240).default(20),
  mode: z.enum(["in_person", "video"]).default("in_person"),
  reason: optionalText(160),
  notes: optionalText(500),
});

export const memberSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().trim().min(2, "Enter a name").max(80),
  relation: z.enum(["self", "spouse", "parent", "child", "grandparent", "sibling", "other"]),
  role: z.enum(["admin", "caregiver", "member", "viewer"]).default("member"),
  dateOfBirth: z
    .string()
    .optional()
    .transform((v) => (v ? v : null))
    .pipe(date.nullable()),
  sex: z
    .enum(["female", "male", "other", ""])
    .optional()
    .transform((v) => (v ? v : null)),
  bloodGroup: z
    .enum([...BLOOD_GROUPS, ""])
    .optional()
    .transform((v) => (v ? v : null)),
  heightCm: optionalNumber(30, 250, true).optional(),
  phone: optionalText(20),
});

export const healthInfoSchema = z.object({
  memberId: z.string().uuid(),
  allergies: z
    .array(z.object({ name: z.string().trim().min(1).max(60), severity: z.enum(["mild", "moderate", "severe"]), reaction: z.string().trim().max(120).optional() }))
    .max(20),
  conditions: z.array(z.object({ name: z.string().trim().min(1).max(60), since: z.string().trim().max(10).optional() })).max(20),
  emergencyContacts: z
    .array(z.object({ name: z.string().trim().min(1).max(60), relation: z.string().trim().max(40), phone: z.string().trim().min(5).max(20) }))
    .max(5),
  notes: optionalText(500),
});

export const inviteSchema = z.object({
  role: z.enum(["caregiver", "member", "viewer", "admin"]),
  email: z
    .string()
    .trim()
    .toLowerCase()
    .optional()
    .transform((v) => (v ? v : null))
    .pipe(z.string().email("Enter a valid email").nullable()),
  memberId: z
    .string()
    .optional()
    .transform((v) => (v ? v : null))
    .pipe(z.string().uuid().nullable()),
});

export const shareSchema = z.object({
  memberId: z.string().uuid(),
  scope: z.enum(["emergency", "summary", "records"]),
  hours: z.coerce.number().int().min(1).max(24 * 366),
  label: optionalText(80),
  consent: z.literal("on", { message: "Please confirm consent to share" }),
});

export const triageSchema = z.object({
  memberId: z.string().uuid(),
  symptoms: z.string().trim().min(3, "Describe what's happening in a few words").max(2000),
  language: z.string().max(8).default("en"),
  durationDays: optionalNumber(0, 365).optional(),
  severity: optionalNumber(1, 10, true).optional(),
  temperatureF: optionalNumber(90, 110).optional(),
  flags: z.record(z.string(), z.boolean()).default({}),
  pregnant: z.boolean().optional(),
});
