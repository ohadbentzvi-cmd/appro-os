-- RLS for whatsapp_templates
ALTER TABLE whatsapp_templates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tenant_isolation" ON whatsapp_templates;
CREATE POLICY "tenant_isolation" ON whatsapp_templates
    FOR ALL USING (
        tenant_id = (auth.jwt() -> 'app_metadata' ->> 'tenant_id')::uuid
    );

-- Enforces at most one default template per tenant.
-- Drizzle ORM cannot express partial unique indexes, so this lives here.
CREATE UNIQUE INDEX IF NOT EXISTS uq_whatsapp_templates_default
    ON whatsapp_templates (tenant_id)
    WHERE is_default = true;
