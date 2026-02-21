import { pgTable, uuid, text, timestamp } from 'drizzle-orm/pg-core';
import { tenants } from './tenants';

export const appRoles = pgTable('app_roles', {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id').notNull()
        .references(() => tenants.id),
    supabaseUserId: uuid('supabase_user_id').notNull(),
    role: text('role', {
        enum: ['manager', 'owner', 'tenant']
    }).notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
});
