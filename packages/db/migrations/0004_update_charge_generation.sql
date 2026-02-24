CREATE OR REPLACE FUNCTION generate_charges_for_month(target_month date, p_tenant_id uuid)
RETURNS integer AS $$
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
$$ LANGUAGE plpgsql;
