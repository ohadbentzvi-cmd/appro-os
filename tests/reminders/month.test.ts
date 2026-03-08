import { describe, it, expect } from 'vitest';
import { formatHebrewMonthYear } from '@/lib/reminders/month';

describe('formatHebrewMonthYear', () => {
    it('formats March correctly', () => {
        expect(formatHebrewMonthYear('2025-03-01')).toBe('מרץ 2025');
    });

    it('formats January correctly', () => {
        expect(formatHebrewMonthYear('2025-01-01')).toBe('ינואר 2025');
    });

    it('formats December correctly', () => {
        expect(formatHebrewMonthYear('2025-12-01')).toBe('דצמבר 2025');
    });

    it('formats November with a different year', () => {
        expect(formatHebrewMonthYear('2024-11-01')).toBe('נובמבר 2024');
    });

    it('formats all 12 months in order', () => {
        const expected = [
            'ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני',
            'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר',
        ];
        for (let m = 1; m <= 12; m++) {
            const dateStr = `2025-${String(m).padStart(2, '0')}-01`;
            expect(formatHebrewMonthYear(dateStr)).toBe(`${expected[m - 1]} 2025`);
        }
    });
});
