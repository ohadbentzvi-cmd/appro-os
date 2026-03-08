import { pgTable, uuid, text, timestamp } from 'drizzle-orm/pg-core';
import { charges } from './charges';
import { people } from './people';

export const reminderLogs = pgTable('reminder_logs', {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id').notNull(),
    chargeId: uuid('charge_id').notNull()
        .references(() => charges.id, { onDelete: 'cascade' }),
    recipientPersonId: uuid('recipient_person_id')
        .references(() => people.id, { onDelete: 'set null' }),
    recipientPhone: text('recipient_phone').notNull(),
    recipientNameUsed: text('recipient_name_used').notNull(),
    twilioMessageSid: text('twilio_message_sid'),
    status: text('status', {
        enum: ['queued', 'sent', 'delivered', 'failed']
    }).notNull().default('queued'),
    failureReason: text('failure_reason'),
    sentAt: timestamp('sent_at', { withTimezone: true }).defaultNow().notNull(),
    deliveredAt: timestamp('delivered_at', { withTimezone: true }),
    sentByPersonId: uuid('sent_by_person_id')
        .references(() => people.id, { onDelete: 'set null' }),
    bulkBatchId: uuid('bulk_batch_id'),
});
