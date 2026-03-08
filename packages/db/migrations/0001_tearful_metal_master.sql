CREATE TABLE "reminder_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"charge_id" uuid NOT NULL,
	"recipient_person_id" uuid,
	"recipient_phone" text NOT NULL,
	"recipient_name_used" text NOT NULL,
	"twilio_message_sid" text,
	"status" text DEFAULT 'queued' NOT NULL,
	"failure_reason" text,
	"sent_at" timestamp with time zone DEFAULT now() NOT NULL,
	"delivered_at" timestamp with time zone,
	"sent_by_person_id" uuid,
	"bulk_batch_id" uuid
);
--> statement-breakpoint
ALTER TABLE "people" ADD COLUMN "whatsapp_name" text;--> statement-breakpoint
ALTER TABLE "reminder_logs" ADD CONSTRAINT "reminder_logs_charge_id_charges_id_fk" FOREIGN KEY ("charge_id") REFERENCES "public"."charges"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reminder_logs" ADD CONSTRAINT "reminder_logs_recipient_person_id_people_id_fk" FOREIGN KEY ("recipient_person_id") REFERENCES "public"."people"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reminder_logs" ADD CONSTRAINT "reminder_logs_sent_by_person_id_people_id_fk" FOREIGN KEY ("sent_by_person_id") REFERENCES "public"."people"("id") ON DELETE set null ON UPDATE no action;