import {
  boolean,
  date,
  index,
  integer,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  smallint,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import type { DetectedFood } from "@/lib/food-photo";

const createdAt = () => timestamp("created_at", { withTimezone: true }).notNull().defaultNow();

// ---------- Enums ----------

export const roleEnum = pgEnum("role", ["owner", "caregiver", "family"]);
export const scopeEnum = pgEnum("scope", ["vitals", "meds", "meals", "mood"]);
export const glucoseContextEnum = pgEnum("glucose_context", ["fasting", "after_meal", "random"]);
export const mealSlotEnum = pgEnum("meal_slot", ["breakfast", "lunch", "dinner", "snack"]);
export const alertSeverityEnum = pgEnum("alert_severity", ["warning", "urgent"]);

export type Role = (typeof roleEnum.enumValues)[number];
export type Scope = (typeof scopeEnum.enumValues)[number];
export type GlucoseContext = (typeof glucoseContextEnum.enumValues)[number];
export type MealSlot = (typeof mealSlotEnum.enumValues)[number];
export type AlertSeverity = (typeof alertSeverityEnum.enumValues)[number];

// ---------- Login ----------

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(), // always stored lowercase
  passwordHash: text("password_hash").notNull(),
  phone: text("phone"), // optional, used for "Call Rahul" tel: links
  createdAt: createdAt(),
});

export const sessions = pgTable(
  "sessions",
  {
    id: text("id").primaryKey(), // random 32-byte hex token, also the cookie value
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: createdAt(),
  },
  (t) => [index("sessions_user_idx").on(t.userId)]
);

// ---------- People and access ----------

export const patients = pgTable("patients", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  birthYear: smallint("birth_year"),
  city: text("city"),
  condition: text("condition").notNull().default("type2_diabetes"),
  glucoseLow: smallint("glucose_low").notNull().default(70),
  glucoseHigh: smallint("glucose_high").notNull().default(300),
  synthetic: boolean("synthetic").notNull().default(false), // demo data, labelled in the UI
  createdBy: uuid("created_by").references(() => users.id, { onDelete: "set null" }),
  createdAt: createdAt(),
});

const patientId = () =>
  uuid("patient_id")
    .notNull()
    .references(() => patients.id, { onDelete: "cascade" });

// Who entered a health row, so the app can say "Rahul logged this for Papa".
const loggedBy = () =>
  uuid("logged_by").references(() => users.id, { onDelete: "set null" });

export const memberships = pgTable(
  "memberships",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    patientId: patientId(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    role: roleEnum("role").notNull(),
    scopes: text("scopes").array().$type<Scope[]>().notNull().default([]),
    createdAt: createdAt(),
  },
  (t) => [
    uniqueIndex("memberships_patient_user_uq").on(t.patientId, t.userId),
    index("memberships_user_idx").on(t.userId),
  ]
);

export const invites = pgTable("invites", {
  id: uuid("id").primaryKey().defaultRandom(),
  patientId: patientId(),
  code: varchar("code", { length: 6 }).notNull().unique(),
  role: roleEnum("role").notNull(),
  scopes: text("scopes").array().$type<Scope[]>().notNull().default([]),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  usedAt: timestamp("used_at", { withTimezone: true }),
  usedBy: uuid("used_by").references(() => users.id, { onDelete: "set null" }),
  createdBy: uuid("created_by").references(() => users.id, { onDelete: "set null" }),
  createdAt: createdAt(),
});

// ---------- Medicines ----------

export const medications = pgTable(
  "medications",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    patientId: patientId(),
    loggedBy: loggedBy(),
    name: text("name").notNull(),
    dose: text("dose").notNull().default(""),
    times: text("times").array().notNull(), // "HH:MM" in India time
    active: boolean("active").notNull().default(true),
    createdAt: createdAt(),
  },
  (t) => [index("medications_patient_idx").on(t.patientId)]
);

// A missed dose is a scheduled slot with no row here.
export const medLogs = pgTable(
  "med_logs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    patientId: patientId(),
    loggedBy: loggedBy(),
    medicationId: uuid("medication_id")
      .notNull()
      .references(() => medications.id, { onDelete: "cascade" }),
    date: date("date", { mode: "string" }).notNull(), // India date, YYYY-MM-DD
    slot: varchar("slot", { length: 5 }).notNull(), // "08:00"
    takenAt: timestamp("taken_at", { withTimezone: true }).notNull().defaultNow(),
    createdAt: createdAt(),
  },
  (t) => [
    uniqueIndex("med_logs_med_date_slot_uq").on(t.medicationId, t.date, t.slot),
    index("med_logs_patient_date_idx").on(t.patientId, t.date),
  ]
);

// ---------- Daily logs ----------

export const glucoseReadings = pgTable(
  "glucose_readings",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    patientId: patientId(),
    loggedBy: loggedBy(),
    mgdl: integer("mgdl").notNull(),
    context: glucoseContextEnum("context").notNull(),
    measuredAt: timestamp("measured_at", { withTimezone: true }).notNull().defaultNow(),
    note: text("note"),
    createdAt: createdAt(),
  },
  (t) => [index("glucose_patient_time_idx").on(t.patientId, t.measuredAt)]
);

export const meals = pgTable(
  "meals",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    patientId: patientId(),
    loggedBy: loggedBy(),
    slot: mealSlotEnum("slot").notNull(),
    items: text("items").array().notNull(), // food keys from lib/foods.ts
    // Foods recognised from a meal photo: names, portions, carb level. Null for chip-only logs.
    details: jsonb("details").$type<DetectedFood[]>(),
    eatenAt: timestamp("eaten_at", { withTimezone: true }).notNull().defaultNow(),
    createdAt: createdAt(),
  },
  (t) => [index("meals_patient_time_idx").on(t.patientId, t.eatenAt)]
);

export const dailyCheckins = pgTable(
  "daily_checkins",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    patientId: patientId(),
    loggedBy: loggedBy(),
    date: date("date", { mode: "string" }).notNull(),
    walked: boolean("walked"),
    sleep: smallint("sleep"), // 1 bad, 2 okay, 3 good
    createdAt: createdAt(),
  },
  (t) => [uniqueIndex("daily_checkins_patient_date_uq").on(t.patientId, t.date)]
);

// Weekly energy check (PHQ-2). Written by the owner only.
export const moodChecks = pgTable(
  "mood_checks",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    patientId: patientId(),
    loggedBy: loggedBy(),
    q1: smallint("q1").notNull(),
    q2: smallint("q2").notNull(),
    score: smallint("score").notNull(),
    selfHarmFlag: boolean("self_harm_flag"), // null when the follow-up was not asked
    checkedAt: timestamp("checked_at", { withTimezone: true }).notNull().defaultNow(),
    createdAt: createdAt(),
  },
  (t) => [index("mood_patient_time_idx").on(t.patientId, t.checkedAt)]
);

export const labResults = pgTable(
  "lab_results",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    patientId: patientId(),
    loggedBy: loggedBy(),
    kind: text("kind").notNull().default("hba1c"),
    value: numeric("value", { precision: 5, scale: 2, mode: "number" }).notNull(),
    takenOn: date("taken_on", { mode: "string" }).notNull(),
    createdAt: createdAt(),
  },
  (t) => [index("lab_patient_idx").on(t.patientId, t.takenOn)]
);

// ---------- Safety, sharing, audit ----------

export const alerts = pgTable(
  "alerts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    patientId: patientId(),
    loggedBy: loggedBy(),
    kind: text("kind").notNull(), // see lib/safety.ts
    severity: alertSeverityEnum("severity").notNull(),
    sourceId: uuid("source_id"), // e.g. the glucose reading that triggered it
    ackBy: uuid("ack_by").references(() => users.id, { onDelete: "set null" }),
    ackAt: timestamp("ack_at", { withTimezone: true }),
    createdAt: createdAt(),
  },
  (t) => [index("alerts_patient_time_idx").on(t.patientId, t.createdAt)]
);

export const shareLinks = pgTable("share_links", {
  id: uuid("id").primaryKey().defaultRandom(),
  patientId: patientId(),
  token: varchar("token", { length: 32 }).notNull().unique(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  includeMood: boolean("include_mood").notNull().default(false),
  revokedAt: timestamp("revoked_at", { withTimezone: true }),
  createdBy: uuid("created_by").references(() => users.id, { onDelete: "set null" }),
  createdAt: createdAt(),
});

// No foreign keys: the trail must outlive a deleted patient or user.
export const auditLog = pgTable(
  "audit_log",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    actorUserId: uuid("actor_user_id"),
    patientId: uuid("patient_id"),
    action: text("action").notNull(),
    detail: jsonb("detail").$type<Record<string, unknown>>().notNull().default({}),
    createdAt: createdAt(),
  },
  (t) => [index("audit_patient_idx").on(t.patientId, t.createdAt)]
);

// ---------- Push reminders (phase 10) ----------

export const pushSubscriptions = pgTable(
  "push_subscriptions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    endpoint: text("endpoint").notNull().unique(),
    keys: jsonb("keys").$type<{ p256dh: string; auth: string }>().notNull(),
    locale: varchar("locale", { length: 2 }).notNull().default("hi"), // language for the notification text
    createdAt: createdAt(),
  },
  (t) => [index("push_user_idx").on(t.userId)]
);

// One row per reminder sent, so a re-run of the cron never pushes twice.
export const sentReminders = pgTable(
  "sent_reminders",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    medicationId: uuid("medication_id")
      .notNull()
      .references(() => medications.id, { onDelete: "cascade" }),
    date: date("date", { mode: "string" }).notNull(),
    slot: varchar("slot", { length: 5 }).notNull(),
    kind: text("kind").$type<"due" | "late">().notNull(),
    createdAt: createdAt(),
  },
  (t) => [uniqueIndex("sent_reminders_uq").on(t.medicationId, t.date, t.slot, t.kind)]
);

// ---------- Family calls (phase 11) ----------

export const callLogs = pgTable(
  "call_logs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    patientId: patientId(),
    callerId: uuid("caller_id").references(() => users.id, { onDelete: "set null" }),
    calleeId: uuid("callee_id").references(() => users.id, { onDelete: "set null" }),
    video: boolean("video").notNull().default(false),
    startedAt: timestamp("started_at", { withTimezone: true }).notNull().defaultNow(),
    endedAt: timestamp("ended_at", { withTimezone: true }),
    createdAt: createdAt(),
  },
  (t) => [index("call_logs_patient_idx").on(t.patientId, t.startedAt)]
);

// ---------- PCOS ----------

export const pcosPhenotypeEnum = pgEnum('pcos_phenotype', [
  'insulin_resistant', 'adrenal_stress', 'inflammatory', 'post_pill',
]);
export const symptomCategoryEnum = pgEnum('symptom_category', [
  'acne_jawline', 'acne_forehead', 'hirsutism_face', 'hirsutism_body',
  'hair_thinning', 'acanthosis', 'bloating', 'fatigue', 'brain_fog',
  'anxiety', 'low_mood', 'irritability', 'craving_sugar', 'craving_carb',
  'pelvic_pain', 'headache', 'insomnia', 'night_waking',
]);
export const movementTypeEnum = pgEnum('movement_type', [
  'walk_10min', 'walk_30min', 'strength_training', 'yoga_gentle',
  'yoga_restorative', 'pilates', 'swimming', 'dance', 'stretching',
  'breathing_exercise', 'rest_day',
]);
export const graceDayReasonEnum = pgEnum('grace_day_reason', [
  'flare_up', 'period', 'travel', 'mental_health', 'sick',
]);

export const pcosPrescriptions = pgTable("pcos_prescriptions", {
  id: uuid("id").primaryKey().defaultRandom(),
  patientId: patientId(),
  loggedBy: loggedBy(),
  doctorName: text("doctor_name").notNull(),
  clinicName: text("clinic_name"),
  prescriptionDate: date("prescription_date", { mode: "string" }).notNull(),
  diagnosis: text("diagnosis").notNull().default("pcos"),
  phenotype: pcosPhenotypeEnum("phenotype"),
  medications: jsonb("medications").$type<{name: string, dose: string, frequency: string, notes?: string}[]>(),
  supplements: jsonb("supplements").$type<{name: string, dose: string, frequency: string}[]>(),
  dietaryAdvice: text("dietary_advice"),
  exerciseAdvice: text("exercise_advice"),
  followUpDate: date("follow_up_date", { mode: "string" }),
  notes: text("notes"),
  active: boolean("active").default(true),
  createdAt: createdAt(),
});

export const pcosProfiles = pgTable("pcos_profiles", {
  id: uuid("id").primaryKey().defaultRandom(),
  patientId: uuid("patient_id").notNull().references(() => patients.id, { onDelete: "cascade" }).unique(),
  prescriptionId: uuid("prescription_id").references(() => pcosPrescriptions.id),
  phenotype: pcosPhenotypeEnum("phenotype").notNull(),
  onboardingAnswers: jsonb("onboarding_answers"),
  cycleBaselineLength: smallint("cycle_baseline_length"),
  diagnosisDate: date("diagnosis_date", { mode: "string" }),
  createdAt: createdAt(),
});

export const cycleLogs = pgTable("cycle_logs", {
  id: uuid("id").primaryKey().defaultRandom(),
  patientId: patientId(),
  loggedBy: loggedBy(),
  startDate: date("start_date", { mode: "string" }).notNull(),
  endDate: date("end_date", { mode: "string" }),
  flowIntensity: smallint("flow_intensity"),
  symptoms: text("symptoms").array(),
  notes: text("notes"),
  createdAt: createdAt(),
}, (t) => [
  index("cycle_logs_patient_start_idx").on(t.patientId, t.startDate)
]);

export const symptomLogs = pgTable("symptom_logs", {
  id: uuid("id").primaryKey().defaultRandom(),
  patientId: patientId(),
  loggedBy: loggedBy(),
  date: date("date", { mode: "string" }).notNull(),
  category: symptomCategoryEnum("category").notNull(),
  severity: smallint("severity").notNull(),
  notes: text("notes"),
  createdAt: createdAt(),
}, (t) => [
  index("symptom_logs_patient_date_idx").on(t.patientId, t.date)
]);

export const pcosFoodLogs = pgTable("pcos_food_logs", {
  id: uuid("id").primaryKey().defaultRandom(),
  patientId: patientId(),
  loggedBy: loggedBy(),
  date: date("date", { mode: "string" }).notNull(),
  slot: mealSlotEnum("slot").notNull(),
  items: text("items").array().notNull(),
  preMealAction: text("pre_meal_action"),
  postMealAction: text("post_meal_action"),
  eatenAt: timestamp("eaten_at", { withTimezone: true }),
  createdAt: createdAt(),
}, (t) => [
  index("pcos_food_logs_patient_date_idx").on(t.patientId, t.date)
]);

export const supplementLogs = pgTable("supplement_logs", {
  id: uuid("id").primaryKey().defaultRandom(),
  patientId: patientId(),
  loggedBy: loggedBy(),
  date: date("date", { mode: "string" }).notNull(),
  supplement: text("supplement").notNull(),
  takenAt: timestamp("taken_at", { withTimezone: true }),
  createdAt: createdAt(),
}, (t) => [
  uniqueIndex("supplement_logs_patient_date_supp_uq").on(t.patientId, t.date, t.supplement)
]);

export const movementLogs = pgTable("movement_logs", {
  id: uuid("id").primaryKey().defaultRandom(),
  patientId: patientId(),
  loggedBy: loggedBy(),
  date: date("date", { mode: "string" }).notNull(),
  type: movementTypeEnum("type").notNull(),
  durationMinutes: smallint("duration_minutes"),
  createdAt: createdAt(),
}, (t) => [
  index("movement_logs_patient_date_idx").on(t.patientId, t.date)
]);

export const sleepLogs = pgTable("sleep_logs", {
  id: uuid("id").primaryKey().defaultRandom(),
  patientId: patientId(),
  loggedBy: loggedBy(),
  date: date("date", { mode: "string" }).notNull(),
  bedtime: varchar("bedtime", { length: 5 }),
  wakeTime: varchar("wake_time", { length: 5 }),
  quality: smallint("quality"),
  createdAt: createdAt(),
}, (t) => [
  uniqueIndex("sleep_logs_patient_date_uq").on(t.patientId, t.date)
]);

export const graceDays = pgTable("grace_days", {
  id: uuid("id").primaryKey().defaultRandom(),
  patientId: patientId(),
  loggedBy: loggedBy(),
  date: date("date", { mode: "string" }).notNull(),
  reason: graceDayReasonEnum("reason").notNull(),
  createdAt: createdAt(),
}, (t) => [
  uniqueIndex("grace_days_patient_date_uq").on(t.patientId, t.date)
]);

export const pcosDailyActions = pgTable("pcos_daily_actions", {
  id: uuid("id").primaryKey().defaultRandom(),
  patientId: patientId(),
  loggedBy: loggedBy(),
  date: date("date", { mode: "string" }).notNull(),
  actionKey: text("action_key").notNull(),
  completed: boolean("completed").default(false),
  createdAt: createdAt(),
}, (t) => [
  index("pcos_daily_actions_patient_date_idx").on(t.patientId, t.date)
]);

export type User = typeof users.$inferSelect;
export type Patient = typeof patients.$inferSelect;
export type Membership = typeof memberships.$inferSelect;
export type Medication = typeof medications.$inferSelect;
export type MedLog = typeof medLogs.$inferSelect;
export type GlucoseReading = typeof glucoseReadings.$inferSelect;
export type Meal = typeof meals.$inferSelect;
export type DailyCheckin = typeof dailyCheckins.$inferSelect;

export type PcosPhenotype = (typeof pcosPhenotypeEnum.enumValues)[number];
export type SymptomCategory = (typeof symptomCategoryEnum.enumValues)[number];
export type MovementType = (typeof movementTypeEnum.enumValues)[number];
export type GraceDayReason = (typeof graceDayReasonEnum.enumValues)[number];

export type PcosPrescription = typeof pcosPrescriptions.$inferSelect;
export type PcosProfile = typeof pcosProfiles.$inferSelect;
export type CycleLog = typeof cycleLogs.$inferSelect;
export type SymptomLog = typeof symptomLogs.$inferSelect;
export type PcosFoodLog = typeof pcosFoodLogs.$inferSelect;
export type SupplementLog = typeof supplementLogs.$inferSelect;
export type MovementLog = typeof movementLogs.$inferSelect;
export type SleepLog = typeof sleepLogs.$inferSelect;
export type GraceDay = typeof graceDays.$inferSelect;
export type PcosDailyAction = typeof pcosDailyActions.$inferSelect;
