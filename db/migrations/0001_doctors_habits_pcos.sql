CREATE TYPE "public"."habit_kind" AS ENUM('water', 'walk', 'sleep', 'produce', 'mindful');--> statement-breakpoint
CREATE TYPE "public"."pcos_phenotype" AS ENUM('insulin_resistant', 'adrenal_stress', 'inflammatory', 'post_pill');--> statement-breakpoint
CREATE TABLE "care_plans" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"member_id" uuid NOT NULL,
	"started_on" date NOT NULL,
	"items" jsonb NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"logged_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cycle_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"member_id" uuid NOT NULL,
	"start_date" date NOT NULL,
	"end_date" date,
	"flow" text DEFAULT 'medium' NOT NULL,
	"notes" text,
	"logged_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "doctor_access" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"doctor_id" uuid NOT NULL,
	"family_id" uuid NOT NULL,
	"member_id" uuid NOT NULL,
	"reason" text DEFAULT 'connected' NOT NULL,
	"logged_by" uuid,
	"expires_at" timestamp with time zone NOT NULL,
	"revoked_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "doctor_notes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"doctor_id" uuid NOT NULL,
	"member_id" uuid NOT NULL,
	"appointment_id" uuid,
	"summary" text NOT NULL,
	"advice" text,
	"follow_up_on" date,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "food_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"member_id" uuid NOT NULL,
	"date" date NOT NULL,
	"meal" text NOT NULL,
	"items" text[] NOT NULL,
	"logged_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "grace_days" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"member_id" uuid NOT NULL,
	"date" date NOT NULL,
	"reason" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "habit_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"member_id" uuid NOT NULL,
	"date" date NOT NULL,
	"kind" "habit_kind" NOT NULL,
	"value" numeric NOT NULL,
	"logged_by" uuid,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pcos_profiles" (
	"member_id" uuid PRIMARY KEY NOT NULL,
	"phenotype" "pcos_phenotype" NOT NULL,
	"answers" jsonb NOT NULL,
	"doctor_name" text,
	"diagnosed_on" date,
	"prescribed" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"supplements" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "protocol_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"member_id" uuid NOT NULL,
	"date" date NOT NULL,
	"action_key" text NOT NULL,
	"logged_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "symptom_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"member_id" uuid NOT NULL,
	"date" date NOT NULL,
	"symptom" text NOT NULL,
	"severity" smallint NOT NULL,
	"logged_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "doctors" ADD COLUMN "user_id" uuid;--> statement-breakpoint
ALTER TABLE "doctors" ADD COLUMN "registration_no" text;--> statement-breakpoint
ALTER TABLE "doctors" ADD COLUMN "phone" text;--> statement-breakpoint
ALTER TABLE "doctors" ADD COLUMN "bio" text;--> statement-breakpoint
ALTER TABLE "doctors" ADD COLUMN "connect_code" varchar(8);--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "is_doctor" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "care_plans" ADD CONSTRAINT "care_plans_member_id_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."members"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "care_plans" ADD CONSTRAINT "care_plans_logged_by_users_id_fk" FOREIGN KEY ("logged_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cycle_logs" ADD CONSTRAINT "cycle_logs_member_id_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."members"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cycle_logs" ADD CONSTRAINT "cycle_logs_logged_by_users_id_fk" FOREIGN KEY ("logged_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "doctor_access" ADD CONSTRAINT "doctor_access_doctor_id_doctors_id_fk" FOREIGN KEY ("doctor_id") REFERENCES "public"."doctors"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "doctor_access" ADD CONSTRAINT "doctor_access_family_id_families_id_fk" FOREIGN KEY ("family_id") REFERENCES "public"."families"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "doctor_access" ADD CONSTRAINT "doctor_access_member_id_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."members"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "doctor_access" ADD CONSTRAINT "doctor_access_logged_by_users_id_fk" FOREIGN KEY ("logged_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "doctor_notes" ADD CONSTRAINT "doctor_notes_doctor_id_doctors_id_fk" FOREIGN KEY ("doctor_id") REFERENCES "public"."doctors"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "doctor_notes" ADD CONSTRAINT "doctor_notes_member_id_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."members"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "doctor_notes" ADD CONSTRAINT "doctor_notes_appointment_id_appointments_id_fk" FOREIGN KEY ("appointment_id") REFERENCES "public"."appointments"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "food_logs" ADD CONSTRAINT "food_logs_member_id_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."members"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "food_logs" ADD CONSTRAINT "food_logs_logged_by_users_id_fk" FOREIGN KEY ("logged_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "grace_days" ADD CONSTRAINT "grace_days_member_id_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."members"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "habit_logs" ADD CONSTRAINT "habit_logs_member_id_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."members"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "habit_logs" ADD CONSTRAINT "habit_logs_logged_by_users_id_fk" FOREIGN KEY ("logged_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pcos_profiles" ADD CONSTRAINT "pcos_profiles_member_id_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."members"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "protocol_logs" ADD CONSTRAINT "protocol_logs_member_id_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."members"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "protocol_logs" ADD CONSTRAINT "protocol_logs_logged_by_users_id_fk" FOREIGN KEY ("logged_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "symptom_logs" ADD CONSTRAINT "symptom_logs_member_id_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."members"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "symptom_logs" ADD CONSTRAINT "symptom_logs_logged_by_users_id_fk" FOREIGN KEY ("logged_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "care_plans_member_idx" ON "care_plans" USING btree ("member_id");--> statement-breakpoint
CREATE UNIQUE INDEX "cycle_logs_member_start_uq" ON "cycle_logs" USING btree ("member_id","start_date");--> statement-breakpoint
CREATE INDEX "doctor_access_doctor_idx" ON "doctor_access" USING btree ("doctor_id");--> statement-breakpoint
CREATE INDEX "doctor_access_member_idx" ON "doctor_access" USING btree ("member_id");--> statement-breakpoint
CREATE INDEX "doctor_notes_member_idx" ON "doctor_notes" USING btree ("member_id","created_at");--> statement-breakpoint
CREATE INDEX "food_logs_member_date_idx" ON "food_logs" USING btree ("member_id","date");--> statement-breakpoint
CREATE UNIQUE INDEX "grace_days_member_date_uq" ON "grace_days" USING btree ("member_id","date");--> statement-breakpoint
CREATE UNIQUE INDEX "habit_logs_member_date_kind_uq" ON "habit_logs" USING btree ("member_id","date","kind");--> statement-breakpoint
CREATE UNIQUE INDEX "protocol_logs_member_date_action_uq" ON "protocol_logs" USING btree ("member_id","date","action_key");--> statement-breakpoint
CREATE UNIQUE INDEX "symptom_logs_member_date_symptom_uq" ON "symptom_logs" USING btree ("member_id","date","symptom");--> statement-breakpoint
ALTER TABLE "doctors" ADD CONSTRAINT "doctors_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "doctors" ADD CONSTRAINT "doctors_user_id_unique" UNIQUE("user_id");--> statement-breakpoint
ALTER TABLE "doctors" ADD CONSTRAINT "doctors_connect_code_unique" UNIQUE("connect_code");