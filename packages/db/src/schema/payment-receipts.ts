import { pgTable, uuid, integer, text, timestamp, unique } from 'drizzle-orm/pg-core';
import { payments } from './payments';

export const paymentReceipts = pgTable('payment_receipts', {
    id:            uuid('id').primaryKey().defaultRandom(),
    tenantId:      uuid('tenant_id').notNull(),
    paymentId:     uuid('payment_id').notNull().unique()
                       .references(() => payments.id, { onDelete: 'cascade' }),
    receiptNumber: integer('receipt_number').notNull(),
    receiptYear:   integer('receipt_year').notNull(),
    payerName:     text('payer_name').notNull(),
    generatedAt:   timestamp('generated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
    unique('unq_receipt_tenant_year_number').on(table.tenantId, table.receiptYear, table.receiptNumber),
]);
