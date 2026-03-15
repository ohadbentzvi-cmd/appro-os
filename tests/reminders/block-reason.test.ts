import { describe, it, expect } from 'vitest';
import { getPreviewBlockReason, type PersonRow } from '@/lib/reminders/block-reason';

const PERSON_ID = 'f47ac10b-58cc-4372-a567-0e02b2c3d479';
const EMPTY_BLOCKED = new Set<string>();

const sendableRow: PersonRow = {
    personId: PERSON_ID,
    availableOnWhatsapp: true,
    whatsappName: 'יונתן',
    phone: '0541234567',
};

describe('getPreviewBlockReason', () => {
    it('returns null for a fully valid row', () => {
        expect(getPreviewBlockReason(sendableRow, EMPTY_BLOCKED)).toBeNull();
    });

    it('returns no_fee_payer when personId is null', () => {
        const row: PersonRow = { ...sendableRow, personId: null };
        expect(getPreviewBlockReason(row, EMPTY_BLOCKED)).toBe('no_fee_payer');
    });

    it('returns not_on_whatsapp when availableOnWhatsapp is false', () => {
        const row: PersonRow = { ...sendableRow, availableOnWhatsapp: false };
        expect(getPreviewBlockReason(row, EMPTY_BLOCKED)).toBe('not_on_whatsapp');
    });

    it('not_on_whatsapp takes priority over missing whatsapp name', () => {
        const row: PersonRow = { ...sendableRow, availableOnWhatsapp: false, whatsappName: null };
        expect(getPreviewBlockReason(row, EMPTY_BLOCKED)).toBe('not_on_whatsapp');
    });

    it('returns no_whatsapp_name when whatsappName is null', () => {
        const row: PersonRow = { ...sendableRow, whatsappName: null };
        expect(getPreviewBlockReason(row, EMPTY_BLOCKED)).toBe('no_whatsapp_name');
    });

    it('returns no_phone when phone is null', () => {
        const row: PersonRow = { ...sendableRow, phone: null };
        expect(getPreviewBlockReason(row, EMPTY_BLOCKED)).toBe('no_phone');
    });

    it('returns invalid_phone when phone cannot be normalized', () => {
        const row: PersonRow = { ...sendableRow, phone: 'not-a-phone' };
        expect(getPreviewBlockReason(row, EMPTY_BLOCKED)).toBe('invalid_phone');
    });

    it('returns cooldown when person is in the blocked set', () => {
        const blocked = new Set([PERSON_ID]);
        expect(getPreviewBlockReason(sendableRow, blocked)).toBe('cooldown');
    });

    it('availableOnWhatsapp=true does not block', () => {
        const row: PersonRow = { ...sendableRow, availableOnWhatsapp: true };
        expect(getPreviewBlockReason(row, EMPTY_BLOCKED)).toBeNull();
    });
});
