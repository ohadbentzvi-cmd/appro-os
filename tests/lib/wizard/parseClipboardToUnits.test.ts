import { describe, it, expect } from 'vitest';
import { parseClipboardToUnits } from '../../../app/lib/wizard/parseClipboardToUnits';

describe('parseClipboardToUnits', () => {
    it('returns EMPTY for empty string', () => {
        expect(parseClipboardToUnits('')).toEqual({ ok: false, error: 'EMPTY' });
        expect(parseClipboardToUnits('   \n  \n')).toEqual({ ok: false, error: 'EMPTY' });
    });

    it('parses a single row with only unit number', () => {
        const text = '12A';
        const res = parseClipboardToUnits(text);
        expect(res).toEqual({
            ok: true,
            units: [{ unit_number: '12A' }],
        });
    });

    it('parses a full 6-column row correctly', () => {
        const text = '1\t2\tJohn Doe\t0501234567\tJane Smith\t0529876543';
        const res = parseClipboardToUnits(text);
        expect(res).toEqual({
            ok: true,
            units: [
                {
                    unit_number: '1',
                    floor: 2,
                    owner: { full_name: 'John Doe', phone: '0501234567' },
                    tenant: { full_name: 'Jane Smith', phone: '0529876543' },
                },
            ],
        });
    });

    it('parses a 3-column row (unit + floor + owner name only)', () => {
        const text = '1\t3\tJohn Doe';
        const res = parseClipboardToUnits(text);
        expect(res).toEqual({
            ok: true,
            units: [
                {
                    unit_number: '1',
                    floor: 3,
                    owner: { full_name: 'John Doe', phone: '' },
                },
            ],
        });
    });

    it('ignores invalid integer in floor column without erroring', () => {
        const text = '1\tABC\tJohn Doe';
        const res = parseClipboardToUnits(text);
        expect(res).toEqual({
            ok: true,
            units: [
                {
                    unit_number: '1',
                    owner: { full_name: 'John Doe', phone: '' },
                }
            ],
        });
    });

    it('returns TOO_MANY_COLUMNS if any row has > 6 columns', () => {
        const text = '1\t2\t3\t4\t5\t6\t7';
        expect(parseClipboardToUnits(text)).toEqual({ ok: false, error: 'TOO_MANY_COLUMNS' });
    });

    it('returns MISSING_UNIT_NUMBER if unit number is empty', () => {
        const text = '\t2\tJohn Doe';
        expect(parseClipboardToUnits(text)).toEqual({ ok: false, error: 'MISSING_UNIT_NUMBER' });
    });

    it('handles multiple mixed rows successfully', () => {
        const text = '1\n2\t\tJohn\t050\n3\t2\t\t\tJane\t052';
        const res = parseClipboardToUnits(text);
        expect(res.ok).toBe(true);
        if (res.ok) {
            expect(res.units).toHaveLength(3);
            expect(res.units[0]).toEqual({ unit_number: '1' });
            expect(res.units[1]).toEqual({
                unit_number: '2',
                owner: { full_name: 'John', phone: '050' },
            });
            expect(res.units[2]).toEqual({
                unit_number: '3',
                floor: 2,
                tenant: { full_name: 'Jane', phone: '052' },
            });
        }
    });
});
