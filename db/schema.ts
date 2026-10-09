import { sql } from "drizzle-orm";
import {
  boolean,
  customType,
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

const createdAt = () => timestamp("created_at", { withTimezone: true }).notNull().defaultNow();

/** Raw bytes. Record files are stored encrypted (AES-256-GCM), see lib/crypto.ts. */
const bytea = customType<{ data: Buffer; driverData: Buffer }>({
  dataType: () => "bytea",
});

// ---------- Enums ----------

export const roleEnum = pgEnum("role", ["admin", "caregiver", "member", "viewer"]);
export const relationEnum = pgEnum("relation", [
  "self",
  "spouse",
  "parent",
  "child",
  "grandparent",
  "sibling",
  "other",
]);
export const sexEnum = pgEnum("sex", ["female", "male", "other"]);
export const doseStatusEnum = pgEnum("dose_status", ["taken", "skipped", "missed"]);
export const vitalKindEnum = pgEnum("vital_kind", ["bp", "sugar", "weight", "pulse", "spo2", "temperature"]);
export const appointmentModeEnum = pgEnum("appointment_mode", ["in_person", "video"]);
export const appointmentStatusEnum = pgEnum("appointment_status", ["scheduled", "completed", "cancelled"]);
export const recordTypeEnum = pgEnum("record_type", [
  "lab_report",
  "prescription",
  "scan",
  "discharge",
  "vaccination",
  "other",
]);
export const shareScopeEnum = pgEnum("share_scope", ["emergency", "summary", "records"]);
export const triageLevelEnum = pgEnum("triage_level", ["emergency", "urgent", "doctor", "self_care"]);
export const severityEnum = pgEnum("severity", ["info", "warning", "urgent"]);

export type Role = (typeof roleEnum.enumValues)[number];
export type Relation = (typeof relationEnum.enumValues)[number];
export type Sex = (typeof sexEnum.enumValues)[number];
export type DoseStatus = (typeof doseStatusEnum.enumValues)[number];
export type VitalKind = (typeof vitalKindEnum.enumValues)[number];
export type AppointmentMode = (typeof appointmentModeEnum.enumValues)[number];
export type AppointmentStatus = (typeof appointmentStatusEnum.enumValues)[number];
export type RecordType = (typeof recordTypeEnum.enumValues)[number];
export type ShareScope = (typeof shareScopeEnum.enumValues)[number];
export type TriageLevel = (typeof triageLevelEnum.enumValues)[number];
export type Severity = (typeof severityEnum.enumValues)[number];

// JSON column shapes
export type Allergy = { name: string; severity: "mild" | "moderate" | "severe"; reaction?: string };
export type Condition = { name: string; since?: string };
export type EmergencyContact = { name: string; relation: string; phone: string };
/** role -> action -> allowed. Missing keys fall back to DEFAULT_PERMISSIONS in lib/permissions.ts. */
export type PermissionOverrides = Partial<Record<Role, Partial<Record<string, boolean>>>>;

// ---------- Login ----------

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(), // stored lowercase
  passwordHash: text("password_hash").notNull(),
  phone: text("phone"),
  emailReminders: boolean("email_reminders").notNull().default(true),
  dailyDigest: boolean("daily_digest").notNull().default(true),
  // Privacy consent captured at sign-up (DPDP-style: purpose, storage, sharing)
  consentAt: timestamp("consent_at", { withTimezone: true }),
  // Doctors sign up with their own account and get the doctor portal instead of a family
  isDoctor: boolean("is_doctor").notNull().default(false),
  createdAt: createdAt(),
});

export const sessions = pgTable(
  "sessions",
  {
    id: text("id").primaryKey(), // sha-256 of the cookie token
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: createdAt(),
  },
  (t) => [index("sessions_user_idx").on(t.userId)]
);

// ---------- Family and members ----------

export const families = pgTable("families", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  city: text("city"),
  permissions: jsonb("permissions").$type<PermissionOverrides>().notNull().default({}),
  createdBy: uuid("created_by").references(() => users.id, { onDelete: "set null" }),
  createdAt: createdAt(),
});

/**
 * One health profile per person in the family. A member may or may not have a login
 * (a child usually does not). `role` is what that person can do once they sign in.
 */
export const members = pgTable(
  "members",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    familyId: uuid("family_id")
      .notNull()
      .references(() => families.id, { onDelete: "cascade" }),
    userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),
    name: text("name").notNull(),
    relation: relationEnum("relation").notNull().default("other"),
    role: roleEnum("role").notNull().default("member"),
    dateOfBirth: date("date_of_birth", { mode: "string" }),
    sex: sexEnum("sex"),
    bloodGroup: varchar("blood_group", { length: 4 }),
    heightCm: smallint("height_cm"),
    phone: text("phone"),
    avatarTone: smallint("avatar_tone").notNull().default(1),
    allergies: jsonb("allergies").$type<Allergy[]>().notNull().default([]),
    conditions: jsonb("conditions").$type<Condition[]>().notNull().default([]),
    emergencyContacts: jsonb("emergency_contacts").$type<EmergencyContact[]>().notNull().default([]),
    // Caregivers only: which members they look after
    assignedMemberIds: uuid("assigned_member_ids").array().notNull().default(sql`'{}'::uuid[]`),
    notes: text("notes"),
    createdAt: createdAt(),
  },
  (t) => [
    index("members_family_idx").on(t.familyId),
    uniqueIndex("members_family_user_uq").on(t.familyId, t.userId),
  ]
);

export const invites = pgTable("invites", {
  id: uuid("id").primaryKey().defaultRandom(),
  familyId: uuid("family_id")
    .notNull()
    .references(() => families.id, { onDelete: "cascade" }),
  code: varchar("code", { length: 8 }).notNull().unique(),
  email: text("email"),
  role: roleEnum("role").notNull(),
  // Link the new login to an existing profile (e.g. "Papa" created by the admin)
  memberId: uuid("member_id").references(() => members.id, { onDelete: "cascade" }),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  usedAt: timestamp("used_at", { withTimezone: true }),
  usedBy: uuid("used_by").references(() => users.id, { onDelete: "set null" }),
  createdBy: uuid("created_by").references(() => users.id, { onDelete: "set null" }),
  createdAt: createdAt(),
});

const memberId = () =>
  uuid("member_id")
    .notNull()
    .references(() => members.id, { onDelete: "cascade" });

const loggedBy = () => uuid("logged_by").references(() => users.id, { onDelete: "set null" });

// ---------- Medicines ----------

export const medications = pgTable(
  "medications",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    memberId: memberId(),
    name: text("name").notNull(), // as on the strip, e.g. "Glycomet"
    genericName: text("generic_name"), // e.g. "Metformin"
    strength: text("strength").notNull().default(""), // "500 mg"
    form: text("form").notNull().default("tablet"),
    instructions: text("instructions"), // "After food"
    times: text("times").array().notNull(), // "HH:MM", India time
    startDate: date("start_date", { mode: "string" }).notNull(),
    endDate: date("end_date", { mode: "string" }),
    pillsLeft: integer("pills_left"),
    refillAt: integer("refill_at").notNull().default(7), // warn when this many pills remain
    prescribedBy: text("prescribed_by"),
    active: boolean("active").notNull().default(true),
    createdBy: loggedBy(),
    createdAt: createdAt(),
  },
  (t) => [index("medications_member_idx").on(t.memberId)]
);

/** One row per scheduled dose that was dealt with. No row and time passed = missed. */
export const doseLogs = pgTable(
  "dose_logs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    medicationId: uuid("medication_id")
      .notNull()
      .references(() => medications.id, { onDelete: "cascade" }),
    memberId: memberId(),
    date: date("date", { mode: "string" }).notNull(),
    time: varchar("time", { length: 5 }).notNull(),
    status: doseStatusEnum("status").notNull(),
    loggedAt: timestamp("logged_at", { withTimezone: true }).notNull().defaultNow(),
    loggedBy: loggedBy(),
  },
  (t) => [
    uniqueIndex("dose_logs_med_date_time_uq").on(t.medicationId, t.date, t.time),
    index("dose_logs_member_date_idx").on(t.memberId, t.date),
  ]
);

// ---------- Vitals ----------

export const vitals = pgTable(
  "vitals",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    memberId: memberId(),
    kind: vitalKindEnum("kind").notNull(),
    value: numeric("value", { mode: "number" }).notNull(), // systolic for bp
    value2: numeric("value2", { mode: "number" }), // diastolic for bp
    context: text("context"), // sugar: fasting | after_meal | random
    measuredAt: timestamp("measured_at", { withTimezone: true }).notNull(),
    note: text("note"),
    loggedBy: loggedBy(),
    createdAt: createdAt(),
  },
  (t) => [index("vitals_member_kind_idx").on(t.memberId, t.kind, t.measuredAt)]
);

// ---------- Doctors and appointments ----------

/** Directory used for booking. Weekly hours per weekday (0 = Sunday). */
export const doctors = pgTable("doctors", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  specialty: text("specialty").notNull(),
  clinic: text("clinic").notNull(),
  city: text("city").notNull(),
  languages: text("languages").array().notNull().default([]),
  yearsExperience: smallint("years_experience").notNull().default(5),
  fee: integer("fee").notNull(), // INR
  teleconsult: boolean("teleconsult").notNull().default(true),
  rating: numeric("rating", { mode: "number" }).notNull().default(4.5),
  hours: jsonb("hours").$type<Record<string, [string, string] | null>>().notNull(),
  slotMinutes: smallint("slot_minutes").notNull().default(20),
  // Set when the doctor has their own login (self-registered or claimed)
  userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }).unique(),
  registrationNo: text("registration_no"),
  phone: text("phone"),
  bio: text("bio"),
  // Families type this to connect the doctor (e.g. "DR4K7Q")
  connectCode: varchar("connect_code", { length: 8 }).unique(),
  createdAt: createdAt(),
});

export const appointments = pgTable(
  "appointments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    memberId: memberId(),
    doctorId: uuid("doctor_id").references(() => doctors.id, { onDelete: "set null" }),
    doctorName: text("doctor_name").notNull(),
    specialty: text("specialty"),
    location: text("location"),
    startsAt: timestamp("starts_at", { withTimezone: true }).notNull(),
    durationMin: smallint("duration_min").notNull().default(20),
    mode: appointmentModeEnum("mode").notNull().default("in_person"),
    meetingUrl: text("meeting_url"),
    reason: text("reason"),
    notes: text("notes"),
    status: appointmentStatusEnum("status").notNull().default("scheduled"),
    createdBy: loggedBy(),
    createdAt: createdAt(),
  },
  (t) => [
    index("appointments_member_idx").on(t.memberId, t.startsAt),
    index("appointments_doctor_idx").on(t.doctorId, t.startsAt),
  ]
);

// ---------- Records ----------

export const records = pgTable(
  "records",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    memberId: memberId(),
    type: recordTypeEnum("type").notNull(),
    title: text("title").notNull(),
    recordDate: date("record_date", { mode: "string" }).notNull(),
    provider: text("provider"), // lab, hospital or doctor
    notes: text("notes"),
    fileName: text("file_name"),
    mimeType: text("mime_type"),
    sizeBytes: integer("size_bytes"),
    // iv (12) | auth tag (16) | ciphertext. Never stored in plain text.
    fileData: bytea("file_data"),
    extracted: jsonb("extracted").$type<Record<string, unknown>>(),
    createdBy: loggedBy(),
    createdAt: createdAt(),
  },
  (t) => [index("records_member_idx").on(t.memberId, t.recordDate)]
);

// ---------- Sharing, triage, notifications, audit ----------

export const shareLinks = pgTable("share_links", {
  id: uuid("id").primaryKey().defaultRandom(),
  familyId: uuid("family_id")
    .notNull()
    .references(() => families.id, { onDelete: "cascade" }),
  memberId: memberId(),
  token: varchar("token", { length: 48 }).notNull().unique(),
  scope: shareScopeEnum("scope").notNull(),
  label: text("label"),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  revokedAt: timestamp("revoked_at", { withTimezone: true }),
  viewCount: integer("view_count").notNull().default(0),
  lastViewedAt: timestamp("last_viewed_at", { withTimezone: true }),
  createdBy: loggedBy(),
  createdAt: createdAt(),
});

export const triageSessions = pgTable("triage_sessions", {
  id: uuid("id").primaryKey().defaultRandom(),
  memberId: memberId(),
  symptoms: text("symptoms").notNull(),
  answers: jsonb("answers").$type<Record<string, unknown>>().notNull().default({}),
  level: triageLevelEnum("level").notNull(),
  redFlags: text("red_flags").array().notNull().default([]),
  source: text("source").notNull(), // "rules" | "ai" | "rules+ai"
  language: varchar("language", { length: 8 }).notNull().default("en"),
  result: jsonb("result").$type<Record<string, unknown>>().notNull(),
  createdBy: loggedBy(),
  createdAt: createdAt(),
});

export const notifications = pgTable(
  "notifications",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    familyId: uuid("family_id")
      .notNull()
      .references(() => families.id, { onDelete: "cascade" }),
    memberId: uuid("member_id").references(() => members.id, { onDelete: "cascade" }),
    kind: text("kind").notNull(), // missed_dose | abnormal_vital | refill | appointment | interaction | digest
    severity: severityEnum("severity").notNull().default("info"),
    title: text("title").notNull(),
    body: text("body").notNull(),
    href: text("href"),
    // Stops the cron job from sending the same reminder twice
    dedupeKey: text("dedupe_key").unique(),
    emailedAt: timestamp("emailed_at", { withTimezone: true }),
    readAt: timestamp("read_at", { withTimezone: true }),
    createdAt: createdAt(),
  },
  (t) => [index("notifications_family_idx").on(t.familyId, t.createdAt)]
);

export const emailLog = pgTable("email_log", {
  id: uuid("id").primaryKey().defaultRandom(),
  to: text("to").notNull(),
  subject: text("subject").notNull(),
  kind: text("kind").notNull(),
  status: text("status").notNull(), // sent | logged | failed
  messageId: text("message_id"),
  previewUrl: text("preview_url"),
  error: text("error"),
  createdAt: createdAt(),
});

export const auditLog = pgTable(
  "audit_log",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    familyId: uuid("family_id")
      .notNull()
      .references(() => families.id, { onDelete: "cascade" }),
    actorUserId: uuid("actor_user_id").references(() => users.id, { onDelete: "set null" }),
    action: text("action").notNull(),
    detail: jsonb("detail").$type<Record<string, unknown>>().notNull().default({}),
    createdAt: createdAt(),
  },
  (t) => [index("audit_family_idx").on(t.familyId, t.createdAt)]
);

// ---------- Doctor access and notes ----------

/** Consent-based, time-limited access for a doctor to one family member's health data. */
export const doctorAccess = pgTable(
  "doctor_access",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    doctorId: uuid("doctor_id")
      .notNull()
      .references(() => doctors.id, { onDelete: "cascade" }),
    familyId: uuid("family_id")
      .notNull()
      .references(() => families.id, { onDelete: "cascade" }),
    memberId: memberId(),
    reason: text("reason").notNull().default("connected"), // connected | booking
    grantedBy: loggedBy(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
    createdAt: createdAt(),
  },
  (t) => [index("doctor_access_doctor_idx").on(t.doctorId), index("doctor_access_member_idx").on(t.memberId)]
);

export const doctorNotes = pgTable(
  "doctor_notes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    doctorId: uuid("doctor_id")
      .notNull()
      .references(() => doctors.id, { onDelete: "cascade" }),
    memberId: memberId(),
    appointmentId: uuid("appointment_id").references(() => appointments.id, { onDelete: "set null" }),
    summary: text("summary").notNull(),
    advice: text("advice"),
    followUpOn: date("follow_up_on", { mode: "string" }),
    createdAt: createdAt(),
  },
  (t) => [index("doctor_notes_member_idx").on(t.memberId, t.createdAt)]
);

// ---------- Habits, care plans and gamification ----------

export const habitKindEnum = pgEnum("habit_kind", ["water", "walk", "sleep", "produce", "mindful"]);
export type HabitKind = (typeof habitKindEnum.enumValues)[number];

/** One row per member, day and habit. Streaks, quests, XP and badges are derived from data, never stored. */
export const habitLogs = pgTable(
  "habit_logs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    memberId: memberId(),
    date: date("date", { mode: "string" }).notNull(),
    kind: habitKindEnum("kind").notNull(),
    value: numeric("value", { mode: "number" }).notNull(),
    loggedBy: loggedBy(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("habit_logs_member_date_kind_uq").on(t.memberId, t.date, t.kind)]
);

export type PlanItem = { key: string; title: string; detail: string; category: "move" | "eat" | "sleep" | "track" | "meds" | "mind"; habit?: HabitKind };

/** Personalized recommendations a member chose to follow, and since when. */
export const carePlans = pgTable(
  "care_plans",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    memberId: memberId(),
    startedOn: date("started_on", { mode: "string" }).notNull(),
    items: jsonb("items").$type<PlanItem[]>().notNull(),
    active: boolean("active").notNull().default(true),
    createdBy: loggedBy(),
    createdAt: createdAt(),
  },
  (t) => [index("care_plans_member_idx").on(t.memberId)]
);

/** Rest days that keep a streak alive (period, flare-up, travel, sick, mental health). */
export const graceDays = pgTable(
  "grace_days",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    memberId: memberId(),
    date: date("date", { mode: "string" }).notNull(),
    reason: text("reason").notNull(),
    createdAt: createdAt(),
  },
  (t) => [uniqueIndex("grace_days_member_date_uq").on(t.memberId, t.date)]
);

// ---------- PCOS care ----------

export const pcosPhenotypeEnum = pgEnum("pcos_phenotype", ["insulin_resistant", "adrenal_stress", "inflammatory", "post_pill"]);
export type PcosPhenotype = (typeof pcosPhenotypeEnum.enumValues)[number];

export type PcosPrescribed = { name: string; dose: string; frequency: string };

export const pcosProfiles = pgTable("pcos_profiles", {
  memberId: uuid("member_id")
    .primaryKey()
    .references(() => members.id, { onDelete: "cascade" }),
  phenotype: pcosPhenotypeEnum("phenotype").notNull(),
  answers: jsonb("answers").$type<Record<string, unknown>>().notNull(),
  doctorName: text("doctor_name"),
  diagnosedOn: date("diagnosed_on", { mode: "string" }),
  prescribed: jsonb("prescribed").$type<PcosPrescribed[]>().notNull().default([]),
  supplements: jsonb("supplements").$type<PcosPrescribed[]>().notNull().default([]),
  createdAt: createdAt(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const cycleLogs = pgTable(
  "cycle_logs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    memberId: memberId(),
    startDate: date("start_date", { mode: "string" }).notNull(),
    endDate: date("end_date", { mode: "string" }),
    flow: text("flow").notNull().default("medium"), // light | medium | heavy
    notes: text("notes"),
    loggedBy: loggedBy(),
    createdAt: createdAt(),
  },
  (t) => [uniqueIndex("cycle_logs_member_start_uq").on(t.memberId, t.startDate)]
);

export const symptomLogs = pgTable(
  "symptom_logs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    memberId: memberId(),
    date: date("date", { mode: "string" }).notNull(),
    symptom: text("symptom").notNull(),
    severity: smallint("severity").notNull(), // 1 mild, 2 moderate, 3 strong
    loggedBy: loggedBy(),
    createdAt: createdAt(),
  },
  (t) => [uniqueIndex("symptom_logs_member_date_symptom_uq").on(t.memberId, t.date, t.symptom)]
);

/** Ticks on the daily PCOS protocol (non-medicine actions like "protein first"). */
export const protocolLogs = pgTable(
  "protocol_logs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    memberId: memberId(),
    date: date("date", { mode: "string" }).notNull(),
    actionKey: text("action_key").notNull(),
    loggedBy: loggedBy(),
    createdAt: createdAt(),
  },
  (t) => [uniqueIndex("protocol_logs_member_date_action_uq").on(t.memberId, t.date, t.actionKey)]
);

export const foodLogs = pgTable(
  "food_logs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    memberId: memberId(),
    date: date("date", { mode: "string" }).notNull(),
    meal: text("meal").notNull(), // breakfast | lunch | dinner | snack
    items: text("items").array().notNull(),
    loggedBy: loggedBy(),
    createdAt: createdAt(),
  },
  (t) => [index("food_logs_member_date_idx").on(t.memberId, t.date)]
);

// Row types for app code
export type User = typeof users.$inferSelect;
export type Family = typeof families.$inferSelect;
export type Member = typeof members.$inferSelect;
export type Invite = typeof invites.$inferSelect;
export type Medication = typeof medications.$inferSelect;
export type DoseLog = typeof doseLogs.$inferSelect;
export type Vital = typeof vitals.$inferSelect;
export type Doctor = typeof doctors.$inferSelect;
export type Appointment = typeof appointments.$inferSelect;
export type HealthRecord = typeof records.$inferSelect;
export type ShareLink = typeof shareLinks.$inferSelect;
export type TriageSession = typeof triageSessions.$inferSelect;
export type Notification = typeof notifications.$inferSelect;
export type AuditEntry = typeof auditLog.$inferSelect;
export type DoctorAccess = typeof doctorAccess.$inferSelect;
export type DoctorNote = typeof doctorNotes.$inferSelect;
export type HabitLog = typeof habitLogs.$inferSelect;
export type CarePlan = typeof carePlans.$inferSelect;
export type PcosProfile = typeof pcosProfiles.$inferSelect;
export type CycleLog = typeof cycleLogs.$inferSelect;
export type SymptomLog = typeof symptomLogs.$inferSelect;
