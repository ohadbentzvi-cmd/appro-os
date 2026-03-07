-- Local development seed data.
-- Creates the Apro tenant row with a fixed UUID so .env.local can reference it.
-- This file is for LOCAL DEV ONLY — never run against staging or production.
--
-- The UUID below is the value to set for APRO_TENANT_ID in .env.local.

INSERT INTO tenants (id, name, created_at, updated_at)
VALUES (
    '00000000-0000-0000-0000-000000000001',
    'Apro (local dev)',
    now(),
    now()
)
ON CONFLICT (id) DO NOTHING;
