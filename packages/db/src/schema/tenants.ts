import { pgTable, uuid, text, timestamp } from 'drizzle-orm/pg-core';

export const tenants = pgTable('tenants', {
    id: uuid('id').primaryKey().defaultRandom(),
    name: text('name').notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
});
