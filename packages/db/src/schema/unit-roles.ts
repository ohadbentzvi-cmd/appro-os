import { pgTable, uuid, text, date, boolean, timestamp } from 'drizzle-orm/pg-core';
import { units } from './units';
import { people } from './people';

export const unitRoles = pgTable('unit_roles', {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id').notNull(),
    unitId: uuid('unit_id').notNull()
        .references(() => units.id, { onDelete: 'cascade' }),
    personId: uuid('person_id').notNull()
        .references(() => people.id, { onDelete: 'cascade' }),
    roleType: text('role_type', {
        enum: ['owner', 'tenant', 'guarantor']
    }).notNull(),
    effectiveFrom: date('effective_from').notNull(),
    effectiveTo: date('effective_to'),
    isFeePayer: boolean('is_fee_payer').default(false).notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
});
