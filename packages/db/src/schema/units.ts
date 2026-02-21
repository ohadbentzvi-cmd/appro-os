import { pgTable, uuid, text, integer, timestamp } from 'drizzle-orm/pg-core';
import { buildings } from './buildings';

export const units = pgTable('units', {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id').notNull(),
    buildingId: uuid('building_id').notNull()
        .references(() => buildings.id, { onDelete: 'cascade' }),
    unitNumber: text('unit_number').notNull(),
    floor: integer('floor').notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
});
