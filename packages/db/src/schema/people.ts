import { pgTable, uuid, text, timestamp } from 'drizzle-orm/pg-core';

export const people = pgTable('people', {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id').notNull(),
    supabaseUserId: uuid('supabase_user_id'),
    fullName: text('full_name').notNull(),
    email: text('email'),
    phone: text('phone'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
});
