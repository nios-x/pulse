CREATE TABLE "call_bookings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"patient_id" uuid NOT NULL,
	"doctor_id" uuid NOT NULL,
	"member_id" uuid NOT NULL,
	"booked_by" uuid,
	"scheduled_at" timestamp with time zone NOT NULL,
	"reason" text,
	"status" text DEFAULT 'requested' NOT NULL,
	"responded_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "call_bookings" ADD CONSTRAINT "call_bookings_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "call_bookings" ADD CONSTRAINT "call_bookings_doctor_id_users_id_fk" FOREIGN KEY ("doctor_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "call_bookings" ADD CONSTRAINT "call_bookings_member_id_users_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "call_bookings" ADD CONSTRAINT "call_bookings_booked_by_users_id_fk" FOREIGN KEY ("booked_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "call_bookings_patient_idx" ON "call_bookings" USING btree ("patient_id","scheduled_at");--> statement-breakpoint
CREATE INDEX "call_bookings_doctor_idx" ON "call_bookings" USING btree ("doctor_id","scheduled_at");