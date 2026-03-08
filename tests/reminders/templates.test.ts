import { describe, it, expect } from 'vitest';
import { parseVariables, extractTwilioBody, resolveContentVariables } from '@/lib/reminders/templates';

describe('parseVariables', () => {
    it('extracts positional slots from body', () => {
        expect(parseVariables('Hello {{1}}, your balance is {{2}}')).toEqual(['1', '2']);
    });

    it('returns slots sorted numerically', () => {
        expect(parseVariables('{{3}} then {{1}} then {{2}}')).toEqual(['1', '2', '3']);
    });

    it('deduplicates repeated slots', () => {
        expect(parseVariables('{{1}} and {{1}} again')).toEqual(['1']);
    });

    it('returns empty array when no slots found', () => {
        expect(parseVariables('No variables here')).toEqual([]);
    });

    it('ignores non-numeric placeholders', () => {
        expect(parseVariables('Hello {{name}} and {{1}}')).toEqual(['1']);
    });
});

describe('extractTwilioBody', () => {
    it('extracts body from twilio/text type', () => {
        const types = { 'twilio/text': { body: 'Hello world' } };
        expect(extractTwilioBody(types)).toBe('Hello world');
    });

    it('prefers twilio/text over whatsapp/card', () => {
        const types = {
            'twilio/text': { body: 'Text body' },
            'whatsapp/card': { body: 'Card body' },
        };
        expect(extractTwilioBody(types)).toBe('Text body');
    });

    it('falls back to whatsapp/card when twilio/text absent', () => {
        const types = { 'whatsapp/card': { body: 'Card body' } };
        expect(extractTwilioBody(types)).toBe('Card body');
    });

    it('falls back to first type with a body field', () => {
        const types = { 'custom/type': { body: 'Custom body' } };
        expect(extractTwilioBody(types)).toBe('Custom body');
    });

    it('returns empty string when no body found', () => {
        const types = { 'twilio/text': { text: 'no body field' } };
        expect(extractTwilioBody(types)).toBe('');
    });

    it('returns empty string for empty types object', () => {
        expect(extractTwilioBody({})).toBe('');
    });
});

describe('resolveContentVariables', () => {
    const baseCtx = {
        recipientName: 'ישראל ישראלי',
        periodMonth: '2024-03-01',
        amountDue: 50000,          // 500 ILS in agorot
        dueDate: '2024-03-15',
        buildingName: 'בניין הורדים',
        unitNumber: '4א',
    };

    it('resolves recipient_name', () => {
        const result = resolveContentVariables({ '1': 'recipient_name' }, baseCtx);
        expect(result['1']).toBe('ישראל ישראלי');
    });

    it('resolves amount_due formatted as ILS currency', () => {
        const result = resolveContentVariables({ '1': 'amount_due' }, baseCtx);
        expect(result['1']).toContain('500');
    });

    it('resolves building_name', () => {
        const result = resolveContentVariables({ '1': 'building_name' }, baseCtx);
        expect(result['1']).toBe('בניין הורדים');
    });

    it('resolves unit_number', () => {
        const result = resolveContentVariables({ '1': 'unit_number' }, baseCtx);
        expect(result['1']).toBe('4א');
    });

    it('resolves due_date as localized Hebrew date', () => {
        const result = resolveContentVariables({ '1': 'due_date' }, baseCtx);
        expect(result['1']).toMatch(/\d/); // contains digits
    });

    it('resolves due_month_name as Hebrew month name', () => {
        const result = resolveContentVariables({ '1': 'due_month_name' }, baseCtx);
        expect(result['1']).toBe('מרץ');
    });

    it('returns empty string for due_month_name when dueDate is null', () => {
        const result = resolveContentVariables(
            { '1': 'due_month_name' },
            { ...baseCtx, dueDate: null },
        );
        expect(result['1']).toBe('');
    });

    it('returns empty string for amount_due when amountDue is undefined', () => {
        const result = resolveContentVariables(
            { '1': 'amount_due' },
            { ...baseCtx, amountDue: undefined },
        );
        expect(result['1']).toBe('');
    });

    it('omits unmapped slots (null value) from result', () => {
        const result = resolveContentVariables({ '1': 'recipient_name', '2': null as never }, baseCtx);
        expect(result).not.toHaveProperty('2');
    });

    it('resolves multiple slots independently', () => {
        const result = resolveContentVariables(
            { '1': 'recipient_name', '2': 'building_name', '3': 'unit_number' },
            baseCtx,
        );
        expect(result['1']).toBe('ישראל ישראלי');
        expect(result['2']).toBe('בניין הורדים');
        expect(result['3']).toBe('4א');
    });

    it('resolves period_month as Hebrew month-year string', () => {
        const result = resolveContentVariables({ '1': 'period_month' }, baseCtx);
        expect(result['1']).toContain('מרץ');
    });
});

describe('resolveContentVariables — due_month_name by month', () => {
    const months = [
        'ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני',
        'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר',
    ];

    months.forEach((name, i) => {
        const month = String(i + 1).padStart(2, '0');
        it(`resolves month ${month} to ${name}`, () => {
            const result = resolveContentVariables(
                { '1': 'due_month_name' },
                { recipientName: 'x', periodMonth: '2024-01-01', dueDate: `2024-${month}-15` },
            );
            expect(result['1']).toBe(name);
        });
    });
});
