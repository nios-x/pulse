ALTER TABLE "users" ADD COLUMN "is_doctor" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "clinic" text;--> statement-breakpoint
-- Anyone already serving a family as its doctor becomes a doctor account.
UPDATE "users" SET "is_doctor" = true WHERE "id" IN (SELECT "user_id" FROM "memberships" WHERE "role" = 'doctor');
