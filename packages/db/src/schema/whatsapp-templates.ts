import { pgTable, uuid, text, boolean, timestamp, jsonb, uniqueIndex } from 'drizzle-orm/pg-core';

export const SYSTEM_FIELDS = [
    'recipient_name',
    'amount_due',
    'due_date',
    'due_month_name',
    'building_name',
    'unit_number',
    'period_month',
] as const;

export type SystemField = typeof SYSTEM_FIELDS[number];

// Maps Twilio variable slot (e.g. "1", "2") to a system field
export type VariableMapping = Partial<Record<string, SystemField>>;

export const whatsappTemplates = pgTable('whatsapp_templates', {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id').notNull(),
    twilioTemplateSid: text('twilio_template_sid').notNull(),
    name: text('name').notNull(),
    nameOverridden: boolean('name_overridden').notNull().default(false),
    body: text('body').notNull(),
    // Positional slot keys parsed from body, e.g. ["1", "2"]
    variables: jsonb('variables').notNull().$type<string[]>().default([]),
    // Manager-configured mapping of slot → system field, e.g. {"1": "recipient_name", "2": "period_month"}
    variableMapping: jsonb('variable_mapping').$type<VariableMapping>().default({}),
    isDefault: boolean('is_default').notNull().default(false),
    lastSyncedAt: timestamp('last_synced_at', { withTimezone: true }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
    uniqueTenantSid: uniqueIndex('uq_whatsapp_templates_tenant_sid')
        .on(table.tenantId, table.twilioTemplateSid),
}));
