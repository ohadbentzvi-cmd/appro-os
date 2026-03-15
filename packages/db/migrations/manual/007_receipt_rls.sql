-- RLS policies for receipt_counters and payment_receipts.
-- Safe to re-run: drops existing policies before recreating them.

ALTER TABLE receipt_counters  ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_receipts  ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE
  tables TEXT[] := ARRAY['receipt_counters', 'payment_receipts'];
  t TEXT;
BEGIN
  FOREACH t IN ARRAY tables LOOP
    EXECUTE format('DROP POLICY IF EXISTS tenant_isolation ON %I', t);
    EXECUTE format(
      'CREATE POLICY tenant_isolation ON %I
         FOR ALL
         TO authenticated
         USING (tenant_id = (auth.jwt() -> ''app_metadata'' ->> ''tenant_id'')::uuid)
         WITH CHECK (tenant_id = (auth.jwt() -> ''app_metadata'' ->> ''tenant_id'')::uuid)',
      t
    );
  END LOOP;
END $$;
