-- RLS policy and performance indexes for reminder_logs.
-- Run after the Drizzle migration (0001_tearful_metal_master.sql) has been applied.
-- Safe to re-run: uses DROP IF EXISTS before CREATE.

ALTER TABLE reminder_logs ENABLE ROW LEVEL SECURITY;

-- Tenant isolation: same pattern as 002_rls.sql
DROP POLICY IF EXISTS tenant_isolation ON reminder_logs;
CREATE POLICY tenant_isolation ON reminder_logs
    FOR ALL
    TO authenticated
    USING (tenant_id = (auth.jwt() -> 'app_metadata' ->> 'tenant_id')::uuid)
    WITH CHECK (tenant_id = (auth.jwt() -> 'app_metadata' ->> 'tenant_id')::uuid);

-- The Twilio webhook handler uses the Supabase service_role key, which bypasses
-- RLS entirely. No additional policy is needed for the webhook route.

-- Index for cooldown check:
-- "has this recipient been messaged in the last 24 hours (non-failed)?"
CREATE INDEX IF NOT EXISTS idx_reminder_logs_cooldown
    ON reminder_logs (tenant_id, recipient_person_id, sent_at)
    WHERE status != 'failed';

-- Index for snapshot query:
-- "what is the latest reminder for each charge?" (used in monthly-snapshot)
CREATE INDEX IF NOT EXISTS idx_reminder_logs_charge_sent
    ON reminder_logs (charge_id, sent_at DESC);
