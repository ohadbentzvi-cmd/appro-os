import { pgTable, uuid, text, integer, timestamp } from 'drizzle-orm/pg-core';
import { tenants } from './tenants';

export const buildings = pgTable('buildings', {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id').notNull(),
    name: text('name').notNull(),
    addressStreet: text('address_street').notNull(),
    addressCity: text('address_city').notNull(),
    numFloors: integer('num_floors').notNull(),
    numUnits: integer('num_units').notNull(),
    builtYear: integer('built_year'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
});
