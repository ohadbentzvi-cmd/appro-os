import { pgTable, uuid, integer, timestamp, unique } from 'drizzle-orm/pg-core';
import { units } from './units';
import { people } from './people';

export const unitPaymentConfig = pgTable('unit_payment_config', {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id').notNull(),
    unitId: uuid('unit_id').notNull()
        .references(() => units.id, { onDelete: 'cascade' }),
    monthlyAmount: integer('monthly_amount').notNull(),
    billingDay: integer('billing_day'),
    createdBy: uuid('created_by')
        .references(() => people.id, { onDelete: 'set null' }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
    unique('unit_payment_config_unit_id_unique').on(table.unitId),
]);
