import { describe, it, expect } from 'vitest';
import { normalizeIsraeliPhone } from '@/lib/reminders/phone';

describe('normalizeIsraeliPhone', () => {
    it('normalizes a standard 10-digit local number', () => {
        expect(normalizeIsraeliPhone('0541234567')).toBe('+972541234567');
    });

    it('strips dashes before normalizing', () => {
        expect(normalizeIsraeliPhone('054-123-4567')).toBe('+972541234567');
    });

    it('strips spaces before normalizing', () => {
        expect(normalizeIsraeliPhone('054 123 4567')).toBe('+972541234567');
    });

    it('handles already-normalized E.164 number', () => {
        expect(normalizeIsraeliPhone('+972541234567')).toBe('+972541234567');
    });

    it('handles 12-digit number without leading +', () => {
        expect(normalizeIsraeliPhone('972541234567')).toBe('+972541234567');
    });

    it('returns null for a 9-digit number missing the leading 0', () => {
        expect(normalizeIsraeliPhone('541234567')).toBeNull();
    });

    it('returns null for a short garbage string', () => {
        expect(normalizeIsraeliPhone('123')).toBeNull();
    });

    it('returns null for an empty string', () => {
        expect(normalizeIsraeliPhone('')).toBeNull();
    });

    it('returns null for a non-Israeli country code', () => {
        // 11 digits starting with 1 (US) — doesn't match either pattern
        expect(normalizeIsraeliPhone('+12025551234')).toBeNull();
    });
});
