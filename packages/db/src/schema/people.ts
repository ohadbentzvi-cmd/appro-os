import { pgTable, uuid, text, timestamp, uniqueIndex, boolean } from 'drizzle-orm/pg-core';

export const people = pgTable('people', {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id').notNull(),
    supabaseUserId: uuid('supabase_user_id'),
    fullName: text('full_name').notNull(),
    email: text('email'),
    phone: text('phone'),
    whatsappName: text('whatsapp_name'),
    availableOnWhatsapp: boolean('available_on_whatsapp').notNull().default(true),
    createdAt: timestamp('created_at').defaultNow().notNull(),
}, (t) => ({
    // Unique per tenant: same phone can exist across different tenants
    tenantPhoneUniqueIdx: uniqueIndex('people_tenant_phone_unique_idx').on(t.tenantId, t.phone),
}));
