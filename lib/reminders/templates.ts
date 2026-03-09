import { type VariableMapping, type SystemField } from '@apro/db/src/schema';
import { formatHebrewMonthYear } from './month';

/** Extracts positional slot numbers from {{1}}, {{2}} etc. in a template body. */
export function parseVariables(body: string): string[] {
    const matches = [...body.matchAll(/\{\{(\d+)\}\}/g)];
    return [...new Set(matches.map(m => m[1]))].sort((a, b) => Number(a) - Number(b));
}

export type ResolvedVarsContext = {
    recipientName: string;
    periodMonth: string;       // YYYY-MM-01
    amountDue?: number;        // in agorot
    dueDate?: string | null;   // ISO date string or null
    buildingName?: string;
    unitNumber?: string;
};

/**
 * Builds the contentVariables object for a Twilio API call by resolving
 * each mapped slot to its real value from the send context.
 */
export function resolveContentVariables(
    mapping: VariableMapping,
    ctx: ResolvedVarsContext,
): Record<string, string> {
    const result: Record<string, string> = {};
    for (const [slot, field] of Object.entries(mapping)) {
        if (field) result[slot] = resolveField(field, ctx);
    }
    return result;
}

export const HEBREW_MONTHS = [
    'ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני',
    'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר',
];

function resolveField(field: SystemField, ctx: ResolvedVarsContext): string {
    switch (field) {
        case 'recipient_name':  return ctx.recipientName;
        case 'period_month':    return formatHebrewMonthYear(ctx.periodMonth);
        case 'amount_due':      return ctx.amountDue != null
            ? (ctx.amountDue / 100).toLocaleString('he-IL', { style: 'currency', currency: 'ILS' })
            : '';
        case 'due_date':        return ctx.dueDate
            ? new Date(ctx.dueDate).toLocaleDateString('he-IL')
            : '';
        case 'due_month_name':  return ctx.dueDate
            ? HEBREW_MONTHS[new Date(ctx.dueDate).getUTCMonth()]
            : '';
        case 'building_name':   return ctx.buildingName ?? '';
        case 'unit_number':     return ctx.unitNumber ?? '';
    }
}

/** Extracts the text body from a Twilio Content API template types object. */
export function extractTwilioBody(types: Record<string, unknown>): string {
    const priorityKeys = [
        'twilio/text',
        'whatsapp/card',
        'whatsapp/quick-reply',
        'whatsapp/list',
        'twilio/media',
    ];
    for (const key of priorityKeys) {
        const t = types[key] as Record<string, unknown> | undefined;
        if (t?.body && typeof t.body === 'string') return t.body;
    }
    // Fallback: first type that has a string body field
    for (const val of Object.values(types)) {
        const t = val as Record<string, unknown> | undefined;
        if (t?.body && typeof t.body === 'string') return t.body;
    }
    return '';
}
