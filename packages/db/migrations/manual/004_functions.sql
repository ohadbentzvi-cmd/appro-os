-- PostgreSQL functions and triggers not managed by Drizzle.
-- Safe to re-run (uses CREATE OR REPLACE, DROP ... IF EXISTS).

-- ─── 1. Charge status trigger ────────────────────────────────────────────────
-- Automatically keeps charges.amount_paid and charges.status in sync
-- whenever a payment is inserted, updated, or deleted.

CREATE OR REPLACE FUNCTION public.update_charge_status_on_payment()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
    v_amount_due     INT;
    v_total_paid     INT;
    v_current_status TEXT;
    v_charge_id      UUID;
BEGIN
    IF TG_OP = 'DELETE' THEN
        v_charge_id := OLD.charge_id;
    ELSE
        v_charge_id := NEW.charge_id;
    END IF;

    SELECT amount_due, status
      INTO v_amount_due, v_current_status
      FROM charges
     WHERE id = v_charge_id;

    -- Never overwrite a manually waived charge
    IF v_current_status = 'waived' THEN
        RETURN NULL;
    END IF;

    SELECT COALESCE(SUM(amount), 0)
      INTO v_total_paid
      FROM payments
     WHERE charge_id = v_charge_id;

    UPDATE charges
       SET amount_paid = v_total_paid,
           status = CASE
               WHEN v_total_paid >= v_amount_due THEN 'paid'
               WHEN v_total_paid > 0             THEN 'partial'
               ELSE                                   'pending'
           END
     WHERE id = v_charge_id;

    RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_update_charge_status ON payments;
CREATE TRIGGER trg_update_charge_status
    AFTER INSERT OR UPDATE OR DELETE ON payments
    FOR EACH ROW
    EXECUTE FUNCTION public.update_charge_status_on_payment();


-- ─── 2. Charge generation function (REMOVED) ─────────────────────────────────
-- Charge generation is now handled by the application layer at onboarding time
-- and on payment-config updates. The pg_cron / manual-API approach is gone.
-- Drop the function so it doesn't reference the dropped charge_generation_log table.
DROP FUNCTION IF EXISTS public.generate_charges_for_month(date, uuid);

