import { describe, it, expect } from 'vitest';
import { reminderPreviewSchema, reminderSendSchema } from '@/lib/api/schemas';

describe('reminderPreviewSchema', () => {
    const UUID_A = 'f47ac10b-58cc-4372-a567-0e02b2c3d479';
    const UUID_B = 'a3bb189e-8bf9-3888-9912-ace4e6543002';

    const validInput = {
        chargeIds: [UUID_A],
        periodMonth: '2025-03-01',
    };

    it('passes with valid input', () => {
        expect(reminderPreviewSchema.safeParse(validInput).success).toBe(true);
    });

    it('passes with multiple chargeIds', () => {
        const input = { chargeIds: [UUID_A, UUID_B], periodMonth: '2025-03-01' };
        expect(reminderPreviewSchema.safeParse(input).success).toBe(true);
    });

    it('fails with empty chargeIds array', () => {
        expect(reminderPreviewSchema.safeParse({ ...validInput, chargeIds: [] }).success).toBe(false);
    });

    it('fails with more than 100 chargeIds', () => {
        // Array length > 100 triggers the .max(100) check before UUID format is validated
        const ids = Array.from({ length: 101 }, () => UUID_A);
        expect(reminderPreviewSchema.safeParse({ ...validInput, chargeIds: ids }).success).toBe(false);
    });

    it('fails with invalid UUID in chargeIds', () => {
        expect(reminderPreviewSchema.safeParse({ ...validInput, chargeIds: ['not-a-uuid'] }).success).toBe(false);
    });

    it('fails when periodMonth is not first of month', () => {
        expect(reminderPreviewSchema.safeParse({ ...validInput, periodMonth: '2025-03-15' }).success).toBe(false);
    });

    it('fails when periodMonth has wrong format', () => {
        expect(reminderPreviewSchema.safeParse({ ...validInput, periodMonth: 'March 2025' }).success).toBe(false);
    });

    it('fails when chargeIds is missing', () => {
        expect(reminderPreviewSchema.safeParse({ periodMonth: '2025-03-01' }).success).toBe(false);
    });
});

describe('reminderSendSchema', () => {
    const CHARGE_UUID = 'f47ac10b-58cc-4372-a567-0e02b2c3d479';
    const PERSON_UUID = 'a3bb189e-8bf9-3888-9912-ace4e6543002';
    const BATCH_UUID  = 'c73bcdcc-2669-4bf6-81d3-e4ae73fb11fd';

    const validMessage = {
        chargeId: CHARGE_UUID,
        recipientPhone: '0541234567',
        recipientName: 'יונתן',
        recipientPersonId: PERSON_UUID,
        periodMonth: '2025-03-01',
    };

    it('passes with a single valid message', () => {
        expect(reminderSendSchema.safeParse({ messages: [validMessage] }).success).toBe(true);
    });

    it('passes with null recipientPersonId (phone override case)', () => {
        const msg = { ...validMessage, recipientPersonId: null };
        expect(reminderSendSchema.safeParse({ messages: [msg] }).success).toBe(true);
    });

    it('passes with an optional bulkBatchId', () => {
        const input = { messages: [validMessage], bulkBatchId: BATCH_UUID };
        expect(reminderSendSchema.safeParse(input).success).toBe(true);
    });

    it('fails with empty messages array', () => {
        expect(reminderSendSchema.safeParse({ messages: [] }).success).toBe(false);
    });

    it('fails when recipientName is empty string', () => {
        const msg = { ...validMessage, recipientName: '' };
        expect(reminderSendSchema.safeParse({ messages: [msg] }).success).toBe(false);
    });

    it('fails when periodMonth is not first of month', () => {
        const msg = { ...validMessage, periodMonth: '2025-03-10' };
        expect(reminderSendSchema.safeParse({ messages: [msg] }).success).toBe(false);
    });

    it('fails when chargeId is not a UUID', () => {
        const msg = { ...validMessage, chargeId: 'bad-id' };
        expect(reminderSendSchema.safeParse({ messages: [msg] }).success).toBe(false);
    });

    it('fails with more than 100 messages', () => {
        const msgs = Array.from({ length: 101 }, () => validMessage);
        expect(reminderSendSchema.safeParse({ messages: msgs }).success).toBe(false);
    });
});
