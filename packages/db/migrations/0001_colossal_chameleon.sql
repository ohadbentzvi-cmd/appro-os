CREATE TABLE "unit_payment_config" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"unit_id" uuid NOT NULL,
	"monthly_amount" integer NOT NULL,
	"effective_from" date NOT NULL,
	"effective_until" date,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "charges" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"unit_id" uuid NOT NULL,
	"period_month" date NOT NULL,
	"amount_due" integer NOT NULL,
	"amount_paid" integer DEFAULT 0 NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"due_date" date NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "unq_charge_unit_period" UNIQUE("unit_id","period_month")
);
--> statement-breakpoint
CREATE TABLE "payments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"charge_id" uuid NOT NULL,
	"amount" integer NOT NULL,
	"payment_method" text NOT NULL,
	"paid_at" timestamp with time zone NOT NULL,
	"recorded_by" uuid,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "buildings" DROP CONSTRAINT "buildings_tenant_id_tenants_id_fk";
--> statement-breakpoint
ALTER TABLE "units" DROP CONSTRAINT "units_tenant_id_tenants_id_fk";
--> statement-breakpoint
ALTER TABLE "units" DROP CONSTRAINT "units_building_id_buildings_id_fk";
--> statement-breakpoint
ALTER TABLE "people" DROP CONSTRAINT "people_tenant_id_tenants_id_fk";
--> statement-breakpoint
ALTER TABLE "unit_roles" DROP CONSTRAINT "unit_roles_tenant_id_tenants_id_fk";
--> statement-breakpoint
ALTER TABLE "unit_roles" DROP CONSTRAINT "unit_roles_unit_id_units_id_fk";
--> statement-breakpoint
ALTER TABLE "unit_roles" DROP CONSTRAINT "unit_roles_person_id_people_id_fk";
--> statement-breakpoint
ALTER TABLE "people" ALTER COLUMN "email" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "buildings" ADD COLUMN "name" text NOT NULL;--> statement-breakpoint
ALTER TABLE "buildings" ADD COLUMN "address_street" text NOT NULL;--> statement-breakpoint
ALTER TABLE "buildings" ADD COLUMN "address_city" text NOT NULL;--> statement-breakpoint
ALTER TABLE "buildings" ADD COLUMN "num_floors" integer NOT NULL;--> statement-breakpoint
ALTER TABLE "buildings" ADD COLUMN "num_units" integer NOT NULL;--> statement-breakpoint
ALTER TABLE "buildings" ADD COLUMN "built_year" integer;--> statement-breakpoint
ALTER TABLE "unit_payment_config" ADD CONSTRAINT "unit_payment_config_unit_id_units_id_fk" FOREIGN KEY ("unit_id") REFERENCES "public"."units"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "unit_payment_config" ADD CONSTRAINT "unit_payment_config_created_by_people_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."people"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "charges" ADD CONSTRAINT "charges_unit_id_units_id_fk" FOREIGN KEY ("unit_id") REFERENCES "public"."units"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_charge_id_charges_id_fk" FOREIGN KEY ("charge_id") REFERENCES "public"."charges"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_recorded_by_people_id_fk" FOREIGN KEY ("recorded_by") REFERENCES "public"."people"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "units" ADD CONSTRAINT "units_building_id_buildings_id_fk" FOREIGN KEY ("building_id") REFERENCES "public"."buildings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "unit_roles" ADD CONSTRAINT "unit_roles_unit_id_units_id_fk" FOREIGN KEY ("unit_id") REFERENCES "public"."units"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "unit_roles" ADD CONSTRAINT "unit_roles_person_id_people_id_fk" FOREIGN KEY ("person_id") REFERENCES "public"."people"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "buildings" DROP COLUMN "address";--> statement-breakpoint
ALTER TABLE "buildings" DROP COLUMN "city";--> statement-breakpoint
ALTER TABLE "buildings" DROP COLUMN "floors";--> statement-breakpoint
ALTER TABLE "buildings" DROP COLUMN "updated_at";--> statement-breakpoint
ALTER TABLE "units" DROP COLUMN "updated_at";--> statement-breakpoint
ALTER TABLE "people" DROP COLUMN "updated_at";--> statement-breakpoint
ALTER TABLE "unit_roles" DROP COLUMN "updated_at";