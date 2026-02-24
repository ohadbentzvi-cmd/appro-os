CREATE TABLE "charge_generation_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"period_month" date NOT NULL,
	"triggered_by" text NOT NULL,
	"charges_created" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
