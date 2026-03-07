-- Row Level Security policies.
-- Safe to re-run: drops existing policies before recreating them.
-- Must be applied to every Supabase project (local, staging, production).

-- Enable RLS on all tables
ALTER TABLE tenants              ENABLE ROW LEVEL SECURITY;
ALTER TABLE buildings            ENABLE ROW LEVEL SECURITY;
ALTER TABLE units                ENABLE ROW LEVEL SECURITY;
ALTER TABLE people               ENABLE ROW LEVEL SECURITY;
ALTER TABLE unit_roles           ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_roles            ENABLE ROW LEVEL SECURITY;
ALTER TABLE unit_payment_config  ENABLE ROW LEVEL SECURITY;
ALTER TABLE charges              ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments             ENABLE ROW LEVEL SECURITY;
ALTER TABLE charge_generation_log ENABLE ROW LEVEL SECURITY;

-- Tenant isolation: all tables except tenants
DO $$
DECLARE
  tables TEXT[] := ARRAY[
    'buildings', 'units', 'people', 'unit_roles',
    'unit_payment_config', 'charges', 'payments', 'charge_generation_log'
  ];
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

-- tenants table: can only see own tenant row
DROP POLICY IF EXISTS own_tenant_only ON tenants;
CREATE POLICY own_tenant_only ON tenants
  FOR ALL
  TO authenticated
  USING (id = (auth.jwt() -> 'app_metadata' ->> 'tenant_id')::uuid)
  WITH CHECK (id = (auth.jwt() -> 'app_metadata' ->> 'tenant_id')::uuid);

-- app_roles: authenticated users can only see rows for their own tenant
DROP POLICY IF EXISTS tenant_isolation ON app_roles;
CREATE POLICY tenant_isolation ON app_roles
  FOR ALL
  TO authenticated
  USING (tenant_id = (auth.jwt() -> 'app_metadata' ->> 'tenant_id')::uuid)
  WITH CHECK (tenant_id = (auth.jwt() -> 'app_metadata' ->> 'tenant_id')::uuid);

-- app_roles: supabase_auth_admin needs SELECT to run the custom_access_token_hook
DROP POLICY IF EXISTS allow_auth_admin_read ON app_roles;
CREATE POLICY allow_auth_admin_read ON app_roles
  FOR SELECT
  TO supabase_auth_admin
  USING (true);
