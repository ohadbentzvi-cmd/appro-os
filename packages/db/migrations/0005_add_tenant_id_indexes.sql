CREATE INDEX IF NOT EXISTS idx_buildings_tenant_id ON buildings(tenant_id);
CREATE INDEX IF NOT EXISTS idx_units_tenant_id ON units(tenant_id);
CREATE INDEX IF NOT EXISTS idx_people_tenant_id ON people(tenant_id);
CREATE INDEX IF NOT EXISTS idx_unit_roles_tenant_id ON unit_roles(tenant_id);
CREATE INDEX IF NOT EXISTS idx_app_roles_tenant_id ON app_roles(tenant_id);
CREATE INDEX IF NOT EXISTS idx_unit_payment_config_tenant_id ON unit_payment_config(tenant_id);
CREATE INDEX IF NOT EXISTS idx_charges_tenant_id ON charges(tenant_id);
CREATE INDEX IF NOT EXISTS idx_payments_tenant_id ON payments(tenant_id);
CREATE INDEX IF NOT EXISTS idx_charge_generation_log_tenant_id ON charge_generation_log(tenant_id);

CREATE INDEX IF NOT EXISTS idx_charges_unit_period ON charges(unit_id, period_month);
CREATE INDEX IF NOT EXISTS idx_unit_roles_unit_active ON unit_roles(unit_id, effective_until) WHERE effective_until IS NULL;
CREATE INDEX IF NOT EXISTS idx_unit_payment_config_unit_active ON unit_payment_config(unit_id, effective_until) WHERE effective_until IS NULL;