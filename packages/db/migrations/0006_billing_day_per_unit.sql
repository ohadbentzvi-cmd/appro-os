-- Migration: billing_day per unit
-- Moves billing_day from buildings to unit_payment_config.
-- Removes effectiveFrom/effectiveUntil versioning — one row per unit.
-- Fully idempotent: safe to run on a DB where these steps were already applied manually.

-- Step 1: add billing_day to payment config (nullable initially)
ALTER TABLE "unit_payment_config"
  ADD COLUMN IF NOT EXISTS "billing_day" integer;
--> statement-breakpoint
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'unit_payment_config_billing_day_check'
  ) THEN
    ALTER TABLE "unit_payment_config"
      ADD CONSTRAINT "unit_payment_config_billing_day_check"
      CHECK (billing_day BETWEEN 1 AND 28);
  END IF;
END $$;
--> statement-breakpoint

-- Step 2: collapse history — only runs if effective_until column still exists
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'unit_payment_config' AND column_name = 'effective_until'
  ) THEN
    DELETE FROM "unit_payment_config" WHERE effective_until IS NOT NULL;
  END IF;
END $$;
--> statement-breakpoint

-- Step 3: backfill billing_day from buildings — only if buildings still has billing_day
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'buildings' AND column_name = 'billing_day'
  ) THEN
    UPDATE "unit_payment_config" upc
    SET billing_day = b.billing_day
    FROM "units" u
    JOIN "buildings" b ON b.id = u.building_id
    WHERE upc.unit_id = u.id
      AND upc.billing_day IS NULL;
  END IF;
END $$;
--> statement-breakpoint

-- Step 4: drop versioning columns
ALTER TABLE "unit_payment_config"
  DROP COLUMN IF EXISTS "effective_from";
--> statement-breakpoint
ALTER TABLE "unit_payment_config"
  DROP COLUMN IF EXISTS "effective_until";
--> statement-breakpoint

-- Step 5: add unique constraint — exactly one config row per unit
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'unit_payment_config_unit_id_unique'
  ) THEN
    ALTER TABLE "unit_payment_config"
      ADD CONSTRAINT "unit_payment_config_unit_id_unique" UNIQUE (unit_id);
  END IF;
END $$;
--> statement-breakpoint

-- Step 6: drop billing_day from buildings
ALTER TABLE "buildings"
  DROP CONSTRAINT IF EXISTS "buildings_billing_day_check";
--> statement-breakpoint
ALTER TABLE "buildings"
  DROP COLUMN IF EXISTS "billing_day";
