-- Migration: billing_day per unit
-- Moves billing_day from buildings to unit_payment_config.
-- Removes effectiveFrom/effectiveUntil versioning — one row per unit.

-- Step 1: add billing_day to payment config (nullable initially)
ALTER TABLE "unit_payment_config"
  ADD COLUMN "billing_day" integer;
--> statement-breakpoint
ALTER TABLE "unit_payment_config"
  ADD CONSTRAINT "unit_payment_config_billing_day_check"
  CHECK (billing_day BETWEEN 1 AND 28);
--> statement-breakpoint

-- Step 2: collapse history — delete closed (historical) config rows.
-- They were never surfaced in UI and charge generation already ignored them.
DELETE FROM "unit_payment_config"
WHERE effective_until IS NOT NULL;
--> statement-breakpoint

-- Step 3: backfill billing_day from each unit's building before we drop the column
UPDATE "unit_payment_config" upc
SET billing_day = b.billing_day
FROM "units" u
JOIN "buildings" b ON b.id = u.building_id
WHERE upc.unit_id = u.id;
--> statement-breakpoint

-- Step 4: drop versioning columns
ALTER TABLE "unit_payment_config"
  DROP COLUMN "effective_from";
--> statement-breakpoint
ALTER TABLE "unit_payment_config"
  DROP COLUMN "effective_until";
--> statement-breakpoint

-- Step 5: add unique constraint — exactly one config row per unit
ALTER TABLE "unit_payment_config"
  ADD CONSTRAINT "unit_payment_config_unit_id_unique" UNIQUE (unit_id);
--> statement-breakpoint

-- Step 6: drop billing_day from buildings
ALTER TABLE "buildings"
  DROP CONSTRAINT IF EXISTS "buildings_billing_day_check";
--> statement-breakpoint
ALTER TABLE "buildings"
  DROP COLUMN "billing_day";
