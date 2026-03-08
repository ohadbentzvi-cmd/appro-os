CREATE TABLE "whatsapp_templates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"twilio_template_sid" text NOT NULL,
	"name" text NOT NULL,
	"name_overridden" boolean DEFAULT false NOT NULL,
	"body" text NOT NULL,
	"variables" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"variable_mapping" jsonb DEFAULT '{}'::jsonb,
	"is_default" boolean DEFAULT false NOT NULL,
	"last_synced_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "reminder_logs" ADD COLUMN "twilio_template_sid" text;--> statement-breakpoint
CREATE UNIQUE INDEX "uq_whatsapp_templates_tenant_sid" ON "whatsapp_templates" USING btree ("tenant_id","twilio_template_sid");