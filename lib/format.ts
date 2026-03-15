const HEBREW_MONTHS = [
    'ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני',
    'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר',
];

/** Formats a YYYY-MM-01 period string as a Hebrew month name + year, e.g. "מרץ 2025" */
export function formatPeriodMonth(periodMonth: string): string {
    const d = new Date(periodMonth);
    return `${HEBREW_MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}

export const paymentMethodLabels: Record<string, string> = {
    cash:          'מזומן',
    bank_transfer: 'העברה בנקאית',
    check:         'צ׳ק',
    direct_debit:  'הוראת קבע',
    portal:        'פורטל',
    credit_card:   'כרטיס אשראי',
};

/** Formats agorot as a whole-ILS currency string, e.g. "₪350" */
export function formatMoney(agorot: number): string {
    return new Intl.NumberFormat('he-IL', {
        style: 'currency',
        currency: 'ILS',
        maximumFractionDigits: 0,
    }).format(Math.round(agorot / 100));
}

/** Formats a Date or ISO string as DD/MM/YYYY */
export function formatDate(date: Date | string): string {
    const d = typeof date === 'string' ? new Date(date) : date;
    return [
        String(d.getDate()).padStart(2, '0'),
        String(d.getMonth() + 1).padStart(2, '0'),
        d.getFullYear(),
    ].join('/');
}
