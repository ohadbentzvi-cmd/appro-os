-- Drop and recreate all tenant_isolation policies to include WITH CHECK

DO $$
DECLARE
  tables TEXT[] := ARRAY[
    'buildings', 'units', 'people', 'unit_roles', 'app_roles',
    'unit_payment_config', 'charges', 'payments', 'charge_generation_log'
  ];
  t TEXT;
BEGIN
  FOREACH t IN ARRAY tables LOOP
    EXECUTE format('DROP POLICY IF EXISTS tenant_isolation ON %I', t);
    EXECUTE format('
      CREATE POLICY tenant_isolation ON %I
        FOR ALL
        TO authenticated
        USING (
          tenant_id = (auth.jwt() -> ''app_metadata'' ->> ''tenant_id'')::uuid
        )
        WITH CHECK (
          tenant_id = (auth.jwt() -> ''app_metadata'' ->> ''tenant_id'')::uuid
        )
    ', t);
  END LOOP;
END $$;

-- The tenants table has its own policy — fix it separately
DROP POLICY IF EXISTS own_tenant_only ON tenants;
CREATE POLICY own_tenant_only ON tenants
  FOR ALL
  TO authenticated
  USING (
    id = (auth.jwt() -> 'app_metadata' ->> 'tenant_id')::uuid
  )
  WITH CHECK (
    id = (auth.jwt() -> 'app_metadata' ->> 'tenant_id')::uuid
  );