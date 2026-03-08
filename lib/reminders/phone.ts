/**
 * Normalize an Israeli phone number to E.164 format (+972...).
 * Applied at send time on both stored and manager-overridden numbers.
 *
 * Handles:
 *   "0541234567"     → "+972541234567"
 *   "054-123-4567"   → "+972541234567"
 *   "054 123 4567"   → "+972541234567"
 *   "972541234567"   → "+972541234567"
 *   "+972541234567"  → "+972541234567"
 *
 * Returns null for anything that cannot be normalized — callers treat null
 * as a blocked entry (shown in the approval modal warning strip).
 */
export function normalizeIsraeliPhone(raw: string): string | null {
    const digits = raw.replace(/\D/g, '');

    // Already has country code without +
    if (digits.startsWith('972') && digits.length === 12) {
        return `+${digits}`;
    }

    // Local format: leading 0 + 9 more digits
    if (digits.startsWith('0') && digits.length === 10) {
        return `+972${digits.slice(1)}`;
    }

    return null;
}
