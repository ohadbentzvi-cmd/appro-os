-- Migration: payment receipt tables
-- Adds receipt_counters (per-tenant-per-year sequence) and
-- payment_receipts (one receipt record per payment).

CREATE TABLE IF NOT EXISTS "receipt_counters" (
    "tenant_id" uuid NOT NULL,
    "year"      integer NOT NULL,
    "last_seq"  integer NOT NULL DEFAULT 0,
    CONSTRAINT "receipt_counters_pkey" PRIMARY KEY ("tenant_id", "year")
);
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "payment_receipts" (
    "id"             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    "tenant_id"      uuid NOT NULL,
    "payment_id"     uuid NOT NULL UNIQUE
                         REFERENCES "payments"("id") ON DELETE CASCADE,
    "receipt_number" integer NOT NULL,
    "receipt_year"   integer NOT NULL,
    "payer_name"     text NOT NULL,
    "generated_at"   timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT "unq_receipt_tenant_year_number"
        UNIQUE ("tenant_id", "receipt_year", "receipt_number")
);
--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "idx_payment_receipts_payment_id"
    ON "payment_receipts"("payment_id");
