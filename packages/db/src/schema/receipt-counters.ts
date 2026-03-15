import { pgTable, uuid, integer, primaryKey } from 'drizzle-orm/pg-core';

export const receiptCounters = pgTable('receipt_counters', {
    tenantId: uuid('tenant_id').notNull(),
    year:     integer('year').notNull(),
    lastSeq:  integer('last_seq').notNull().default(0),
}, (table) => [
    primaryKey({ columns: [table.tenantId, table.year] }),
]);
