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

export const roleEnum = pgEnum("role", ["owner", "caregiver", "family", "doctor"]);
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
  // A doctor account serves families: no health profile of its own, joins each family by invite.
  isDoctor: boolean("is_doctor").notNull().default(false),
  clinic: text("clinic"), // doctor only, e.g. "Verma Diabetes Clinic, Kanpur"
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

// A family member asks the doctor for a call at a set time; the doctor accepts or declines.
export const callBookings = pgTable(
  "call_bookings",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    patientId: patientId(),
    doctorId: uuid("doctor_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    memberId: uuid("member_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    bookedBy: uuid("booked_by").references(() => users.id, { onDelete: "set null" }),
    scheduledAt: timestamp("scheduled_at", { withTimezone: true }).notNull(),
    reason: text("reason"),
    status: text("status").$type<"requested" | "accepted" | "declined" | "cancelled">().notNull().default("requested"),
    respondedAt: timestamp("responded_at", { withTimezone: true }),
    createdAt: createdAt(),
  },
  (t) => [
    index("call_bookings_patient_idx").on(t.patientId, t.scheduledAt),
    index("call_bookings_doctor_idx").on(t.doctorId, t.scheduledAt),
  ]
);

export type User = typeof users.$inferSelect;
export type Patient = typeof patients.$inferSelect;
export type Membership = typeof memberships.$inferSelect;
export type Medication = typeof medications.$inferSelect;
export type MedLog = typeof medLogs.$inferSelect;
export type GlucoseReading = typeof glucoseReadings.$inferSelect;
export type Meal = typeof meals.$inferSelect;
export type DailyCheckin = typeof dailyCheckins.$inferSelect;
