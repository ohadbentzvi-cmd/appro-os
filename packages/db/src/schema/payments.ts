import { pgTable, uuid, integer, text, timestamp } from 'drizzle-orm/pg-core';
import { charges } from './charges';
import { people } from './people';

export const payments = pgTable('payments', {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id').notNull(),
    chargeId: uuid('charge_id').notNull()
        .references(() => charges.id, { onDelete: 'cascade' }),
    amount: integer('amount').notNull(),
    paymentMethod: text('payment_method', { enum: ['cash', 'bank_transfer', 'check', 'direct_debit', 'portal', 'credit_card'] }).notNull(),
    paidAt: timestamp('paid_at', { withTimezone: true }).notNull(),
    recordedBy: uuid('recorded_by')
        .references(() => people.id, { onDelete: 'set null' }),
    notes: text('notes'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});
