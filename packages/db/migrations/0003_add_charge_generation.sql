CREATE OR REPLACE FUNCTION generate_charges_for_month(target_month date, p_tenant_id uuid)
RETURNS integer AS $$
DECLARE
    v_inserted_count integer := 0;
BEGIN
    -- Insert a new charge for each active configuration matching the tenant
    -- Active means effective_from <= target_month and (effective_until IS NULL OR effective_until >= target_month)
    -- Actually, simple active rule from instruction: effective_until is null (currently active)
    
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

    RETURN v_inserted_count;
END;
$$ LANGUAGE plpgsql;
