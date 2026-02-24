import { pgTable, uuid, integer, text, timestamp, date } from 'drizzle-orm/pg-core';

export const chargeGenerationLog = pgTable('charge_generation_log', {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id').notNull(),
    periodMonth: date('period_month').notNull(),
    triggeredBy: text('triggered_by', { enum: ['manual_api', 'pg_cron'] }).notNull(),
    chargesCreated: integer('charges_created').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});
