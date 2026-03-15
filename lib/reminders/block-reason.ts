import { normalizeIsraeliPhone } from './phone';

export type BlockReason =
    | 'no_fee_payer'
    | 'not_on_whatsapp'
    | 'no_whatsapp_name'
    | 'no_phone'
    | 'invalid_phone'
    | 'cooldown'
    | 'charge_not_found';

export interface PersonRow {
    personId: string | null;
    availableOnWhatsapp: boolean | null;
    whatsappName: string | null;
    phone: string | null;
}

/**
 * Pure function: determines why a charge cannot receive a WhatsApp reminder.
 * Returns null when the charge is sendable.
 * Testable without any DB dependency.
 */
export function getPreviewBlockReason(
    row: PersonRow,
    blockedPersonIds: Set<string>,
): BlockReason | null {
    if (!row.personId) return 'no_fee_payer';
    if (row.availableOnWhatsapp === false) return 'not_on_whatsapp';
    if (!row.whatsappName) return 'no_whatsapp_name';
    if (!row.phone) return 'no_phone';
    if (!normalizeIsraeliPhone(row.phone)) return 'invalid_phone';
    if (blockedPersonIds.has(row.personId)) return 'cooldown';
    return null;
}
