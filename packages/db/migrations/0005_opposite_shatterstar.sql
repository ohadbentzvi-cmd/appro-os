ALTER TABLE "buildings" ADD COLUMN "billing_day" integer DEFAULT 10 NOT NULL;
--> statement-breakpoint
ALTER TABLE "buildings" ADD CONSTRAINT "buildings_billing_day_check" CHECK (billing_day BETWEEN 1 AND 28);