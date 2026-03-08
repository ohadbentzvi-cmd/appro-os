/**
 * Format a YYYY-MM-DD date string as a Hebrew month name + year.
 * Used as Twilio template variable {{2}}.
 * Example: "2025-03-01" → "מרץ 2025"
 *
 * Matches the format already used throughout the app (payments/log/page.tsx).
 */
const HEBREW_MONTHS = [
    'ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני',
    'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר',
];

export function formatHebrewMonthYear(dateStr: string): string {
    const d = new Date(dateStr);
    return `${HEBREW_MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}
