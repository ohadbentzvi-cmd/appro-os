CREATE OR REPLACE FUNCTION update_charge_status_on_payment()
RETURNS TRIGGER AS $$
DECLARE
    v_amount_due INT;
    v_total_paid INT;
    v_current_status TEXT;
    v_charge_id UUID;
BEGIN
    -- Determine the charge_id based on the operation
    IF TG_OP = 'DELETE' THEN
        v_charge_id := OLD.charge_id;
    ELSE
        v_charge_id := NEW.charge_id;
    END IF;

    -- Get current charge details
    SELECT amount_due, status INTO v_amount_due, v_current_status
    FROM charges
    WHERE id = v_charge_id;

    -- If the status is waived, do not update it or the amount_paid, just skip
    IF v_current_status = 'waived' THEN
        RETURN NULL;
    END IF;

    -- Calculate total paid for this charge
    SELECT COALESCE(SUM(amount), 0) INTO v_total_paid
    FROM payments
    WHERE charge_id = v_charge_id;

    -- Update the charge status and amount_paid
    UPDATE charges
    SET 
        amount_paid = v_total_paid,
        status = CASE 
            WHEN v_total_paid >= v_amount_due THEN 'paid'
            WHEN v_total_paid > 0 THEN 'partial'
            ELSE 'pending'
        END
    WHERE id = v_charge_id;

    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_update_charge_status ON payments;
CREATE TRIGGER trg_update_charge_status
    AFTER INSERT OR UPDATE OR DELETE
    ON payments
    FOR EACH ROW
    EXECUTE FUNCTION update_charge_status_on_payment();
