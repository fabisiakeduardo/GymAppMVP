ALTER TABLE "body_metrics" ALTER COLUMN "weight_kg" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "routines" ADD COLUMN "source" text DEFAULT 'manual' NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "height_cm" double precision;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "birth_date" date;