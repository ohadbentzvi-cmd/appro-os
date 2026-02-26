-- Step 1: Enable RLS on all tables
ALTER TABLE "tenants" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "buildings" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "units" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "people" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "unit_roles" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "app_roles" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "unit_payment_config" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "charges" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "payments" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "charge_generation_log" ENABLE ROW LEVEL SECURITY;

-- Step 2: Create JWT custom access token hook function
CREATE OR REPLACE FUNCTION public.custom_access_token_hook(event jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    claims jsonb;
    user_app_role record;
BEGIN
    SELECT tenant_id, role INTO user_app_role FROM public.app_roles WHERE supabase_user_id = (event->>'user_id')::uuid LIMIT 1;
    
    claims := event->'claims';
    
    IF user_app_role IS NOT NULL THEN
        claims := jsonb_set(claims, '{app_metadata, tenant_id}', to_jsonb(user_app_role.tenant_id));
        claims := jsonb_set(claims, '{app_metadata, app_role}', to_jsonb(user_app_role.role));
    END IF;
    
    event := jsonb_set(event, '{claims}', claims);
    
    RETURN event;
END;
$$;

-- Grant permissions for Supabase Auth to execute the hook
GRANT USAGE ON SCHEMA public TO supabase_auth_admin;
REVOKE EXECUTE ON FUNCTION public.custom_access_token_hook FROM authenticated, anon, public;
GRANT EXECUTE ON FUNCTION public.custom_access_token_hook TO supabase_auth_admin;

-- Step 3: RLS Policies
CREATE POLICY "own_tenant_only" ON "tenants"
  FOR SELECT
  TO authenticated
  USING (id = (auth.jwt() -> 'app_metadata' ->> 'tenant_id')::uuid);

CREATE POLICY "tenant_isolation" ON "buildings" FOR ALL TO authenticated USING (tenant_id = (auth.jwt() -> 'app_metadata' ->> 'tenant_id')::uuid);
CREATE POLICY "tenant_isolation" ON "units" FOR ALL TO authenticated USING (tenant_id = (auth.jwt() -> 'app_metadata' ->> 'tenant_id')::uuid);
CREATE POLICY "tenant_isolation" ON "people" FOR ALL TO authenticated USING (tenant_id = (auth.jwt() -> 'app_metadata' ->> 'tenant_id')::uuid);
CREATE POLICY "tenant_isolation" ON "unit_roles" FOR ALL TO authenticated USING (tenant_id = (auth.jwt() -> 'app_metadata' ->> 'tenant_id')::uuid);
CREATE POLICY "tenant_isolation" ON "app_roles" FOR ALL TO authenticated USING (tenant_id = (auth.jwt() -> 'app_metadata' ->> 'tenant_id')::uuid);
CREATE POLICY "tenant_isolation" ON "unit_payment_config" FOR ALL TO authenticated USING (tenant_id = (auth.jwt() -> 'app_metadata' ->> 'tenant_id')::uuid);
CREATE POLICY "tenant_isolation" ON "charges" FOR ALL TO authenticated USING (tenant_id = (auth.jwt() -> 'app_metadata' ->> 'tenant_id')::uuid);
CREATE POLICY "tenant_isolation" ON "payments" FOR ALL TO authenticated USING (tenant_id = (auth.jwt() -> 'app_metadata' ->> 'tenant_id')::uuid);
CREATE POLICY "tenant_isolation" ON "charge_generation_log" FOR ALL TO authenticated USING (tenant_id = (auth.jwt() -> 'app_metadata' ->> 'tenant_id')::uuid);

-- Step 4: Ensure generate_charges_for_month bypasses RLS
ALTER FUNCTION public.generate_charges_for_month(date, uuid) SECURITY DEFINER;