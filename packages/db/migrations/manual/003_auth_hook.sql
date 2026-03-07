-- Custom access token hook: injects tenant_id and app_role into the JWT
-- app_metadata so route handlers can read them without a DB query.
-- Safe to re-run (uses CREATE OR REPLACE).
--
-- After running this SQL, you must also register the hook manually in the
-- Supabase dashboard: Authentication → Hooks → Custom Access Token Hook
-- → select public.custom_access_token_hook

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
    SELECT tenant_id, role
      INTO user_app_role
      FROM public.app_roles
     WHERE supabase_user_id = (event->>'user_id')::uuid
     LIMIT 1;

    claims := event->'claims';

    IF user_app_role IS NOT NULL THEN
        claims := jsonb_set(claims, '{app_metadata,tenant_id}', to_jsonb(user_app_role.tenant_id));
        claims := jsonb_set(claims, '{app_metadata,app_role}', to_jsonb(user_app_role.role));
    END IF;

    event := jsonb_set(event, '{claims}', claims);
    RETURN event;
END;
$$;

-- Permissions
GRANT USAGE ON SCHEMA public TO supabase_auth_admin;
REVOKE EXECUTE ON FUNCTION public.custom_access_token_hook FROM authenticated, anon, public;
GRANT EXECUTE ON FUNCTION public.custom_access_token_hook TO supabase_auth_admin;
