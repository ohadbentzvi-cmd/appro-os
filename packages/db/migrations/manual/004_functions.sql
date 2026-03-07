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


-- ─── 2. Charge generation function ──────────────────────────────────────────
-- Generates one pending charge per active unit_payment_config for a given
-- tenant and month. Called by the manual API endpoint and by pg_cron.
-- SECURITY DEFINER so it bypasses RLS (runs as function owner, not caller).

CREATE OR REPLACE FUNCTION public.generate_charges_for_month(
    target_month date,
    p_tenant_id  uuid
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_inserted_count integer := 0;
BEGIN
    WITH inserted AS (
        INSERT INTO charges (
            tenant_id,
            unit_id,
            period_month,
            amount_due,
            status,
            due_date
        )
        SELECT
            c.tenant_id,
            c.unit_id,
            date_trunc('month', target_month)::date,
            c.monthly_amount,
            'pending',
            (date_trunc('month', target_month) + interval '9 days')::date
        FROM unit_payment_config c
        WHERE c.tenant_id = p_tenant_id
          AND c.effective_until IS NULL
        ON CONFLICT (unit_id, period_month) DO NOTHING
        RETURNING 1
    )
    SELECT COUNT(*) INTO v_inserted_count FROM inserted;

    INSERT INTO charge_generation_log (
        tenant_id,
        period_month,
        triggered_by,
        charges_created
    ) VALUES (
        p_tenant_id,
        date_trunc('month', target_month)::date,
        'pg_cron',
        v_inserted_count
    );

    RETURN v_inserted_count;
END;
$$;
