import { describe, it, expect } from 'vitest';
import { isWithinCooldown } from '@/lib/reminders/cooldown';

const HOUR = 60 * 60 * 1000;
const now = Date.now();

describe('isWithinCooldown', () => {
    it('blocks a reminder sent 1 hour ago', () => {
        const sentAt = new Date(now - 1 * HOUR).toISOString();
        expect(isWithinCooldown(sentAt, now)).toBe(true);
    });

    it('blocks a reminder sent 23 hours and 59 minutes ago', () => {
        const sentAt = new Date(now - (23 * HOUR + 59 * 60 * 1000)).toISOString();
        expect(isWithinCooldown(sentAt, now)).toBe(true);
    });

    it('allows a reminder sent exactly 24 hours ago', () => {
        const sentAt = new Date(now - 24 * HOUR).toISOString();
        expect(isWithinCooldown(sentAt, now)).toBe(false);
    });

    it('allows a reminder sent 25 hours ago', () => {
        const sentAt = new Date(now - 25 * HOUR).toISOString();
        expect(isWithinCooldown(sentAt, now)).toBe(false);
    });

    it('allows a reminder sent 3 days ago', () => {
        const sentAt = new Date(now - 72 * HOUR).toISOString();
        expect(isWithinCooldown(sentAt, now)).toBe(false);
    });

    it('blocks a reminder sent just 1 second ago', () => {
        const sentAt = new Date(now - 1000).toISOString();
        expect(isWithinCooldown(sentAt, now)).toBe(true);
    });
});
