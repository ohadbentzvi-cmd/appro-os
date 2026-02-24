import { pgTable, uuid, integer, text, timestamp, date, unique } from 'drizzle-orm/pg-core';
import { units } from './units';

export const charges = pgTable('charges', {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id').notNull(),
    unitId: uuid('unit_id').notNull()
        .references(() => units.id, { onDelete: 'cascade' }),
    periodMonth: date('period_month').notNull(),
    amountDue: integer('amount_due').notNull(),
    amountPaid: integer('amount_paid').default(0).notNull(),
    status: text('status', { enum: ['pending', 'paid', 'partial', 'waived'] }).default('pending').notNull(),
    dueDate: date('due_date').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
    unqUnitPeriod: unique('unq_charge_unit_period').on(table.unitId, table.periodMonth)
}));
