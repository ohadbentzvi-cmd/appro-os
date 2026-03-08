import { NextRequest } from 'next/server';
import { db } from '@apro/db';
import { charges, units, buildings, unitRoles, people, appRoles } from '@apro/db/src/schema';
import { eq, and, inArray, isNull } from 'drizzle-orm';
import { getServerUser } from '@/lib/supabase/server';
import { validateBody } from '@/lib/api/validate';
import { errorResponse, successResponse } from '@/lib/api/response';
import { reminderPreviewSchema } from '@/lib/api/schemas';
import { normalizeIsraeliPhone } from '@/lib/reminders/phone';
import { getBlockedPersonIds } from '@/lib/reminders/cooldown';

export async function POST(req: NextRequest) {
    try {
        const { user, tenantId } = await getServerUser();
        if (!user || !tenantId) return errorResponse('Unauthorized', 401);

        const [role] = await db.select().from(appRoles).where(
            and(
                eq(appRoles.supabaseUserId, user.id),
                eq(appRoles.tenantId, tenantId),
                eq(appRoles.role, 'manager'),
            )
        );
        if (!role) return errorResponse('Forbidden', 403);

        const valid = await validateBody(req, reminderPreviewSchema);
        if ('error' in valid) return valid.error;
        const { chargeIds, periodMonth } = valid.data;

        // Fetch charge + unit + building + fee payer for each chargeId in one query
        const rows = await db
            .select({
                chargeId: charges.id,
                unitId: units.id,
                unitNumber: units.unitNumber,
                buildingAddress: buildings.addressStreet,
                buildingId: buildings.id,
                personId: people.id,
                whatsappName: people.whatsappName,
                phone: people.phone,
            })
            .from(charges)
            .innerJoin(units, eq(units.id, charges.unitId))
            .innerJoin(buildings, eq(buildings.id, units.buildingId))
            .leftJoin(
                unitRoles,
                and(
                    eq(unitRoles.unitId, charges.unitId),
                    eq(unitRoles.isFeePayer, true),
                    isNull(unitRoles.effectiveTo),
                )
            )
            .leftJoin(people, eq(people.id, unitRoles.personId))
            .where(
                and(
                    inArray(charges.id, chargeIds),
                    eq(charges.tenantId, tenantId),
                )
            );

        const blockedPersonIds = await getBlockedPersonIds(db as any, tenantId);

        // Fetch last reminder per charge for display in preview cards
        const { reminderLogs } = await import('@apro/db/src/schema');
        const { desc } = await import('drizzle-orm');

        const lastReminderRows = await db
            .selectDistinctOn([reminderLogs.chargeId], {
                chargeId: reminderLogs.chargeId,
                status: reminderLogs.status,
                sentAt: reminderLogs.sentAt,
            })
            .from(reminderLogs)
            .where(
                and(
                    eq(reminderLogs.tenantId, tenantId),
                    inArray(reminderLogs.chargeId, chargeIds),
                )
            )
            .orderBy(reminderLogs.chargeId, desc(reminderLogs.sentAt));

        const lastReminderByCharge = new Map(
            lastReminderRows.map(r => [r.chargeId, { status: r.status, sentAt: r.sentAt?.toISOString() ?? null }])
        );

        // Build preview — track seen personIds for deduplication
        const seenPersonIds = new Set<string>();

        const preview = chargeIds.map(chargeId => {
            const row = rows.find(r => r.chargeId === chargeId);

            if (!row) {
                return {
                    chargeId,
                    unitIdentifier: null,
                    buildingAddress: null,
                    buildingId: null,
                    recipientPersonId: null,
                    recipientName: null,
                    recipientPhone: null,
                    blockReason: 'charge_not_found' as const,
                    cooldownSince: null,
                    lastReminder: null,
                    isDuplicate: false,
                };
            }

            const lastReminder = lastReminderByCharge.get(chargeId) ?? null;

            // Guard: no fee payer assigned at all
            if (!row.personId) {
                return {
                    chargeId,
                    unitIdentifier: row.unitNumber,
                    buildingAddress: row.buildingAddress,
                    buildingId: row.buildingId,
                    recipientPersonId: null,
                    recipientName: null,
                    recipientPhone: null,
                    blockReason: 'no_fee_payer' as const,
                    cooldownSince: null,
                    lastReminder,
                    isDuplicate: false,
                };
            }

            // Guard: missing whatsapp name
            if (!row.whatsappName) {
                return {
                    chargeId,
                    unitIdentifier: row.unitNumber,
                    buildingAddress: row.buildingAddress,
                    buildingId: row.buildingId,
                    recipientPersonId: row.personId,
                    recipientName: null,
                    recipientPhone: row.phone ?? null,
                    blockReason: 'no_whatsapp_name' as const,
                    cooldownSince: null,
                    lastReminder,
                    isDuplicate: false,
                };
            }

            // Guard: missing phone
            if (!row.phone) {
                return {
                    chargeId,
                    unitIdentifier: row.unitNumber,
                    buildingAddress: row.buildingAddress,
                    buildingId: row.buildingId,
                    recipientPersonId: row.personId,
                    recipientName: row.whatsappName,
                    recipientPhone: null,
                    blockReason: 'no_phone' as const,
                    cooldownSince: null,
                    lastReminder,
                    isDuplicate: false,
                };
            }

            // Guard: phone can't be normalized
            const normalizedPhone = normalizeIsraeliPhone(row.phone);
            if (!normalizedPhone) {
                return {
                    chargeId,
                    unitIdentifier: row.unitNumber,
                    buildingAddress: row.buildingAddress,
                    buildingId: row.buildingId,
                    recipientPersonId: row.personId,
                    recipientName: row.whatsappName,
                    recipientPhone: row.phone,
                    blockReason: 'invalid_phone' as const,
                    cooldownSince: null,
                    lastReminder,
                    isDuplicate: false,
                };
            }

            // Guard: cooldown
            if (blockedPersonIds.has(row.personId)) {
                const cooldownLog = lastReminderRows.find(
                    r => r.chargeId === chargeId
                );
                return {
                    chargeId,
                    unitIdentifier: row.unitNumber,
                    buildingAddress: row.buildingAddress,
                    buildingId: row.buildingId,
                    recipientPersonId: row.personId,
                    recipientName: row.whatsappName,
                    recipientPhone: normalizedPhone,
                    blockReason: 'cooldown' as const,
                    cooldownSince: cooldownLog?.sentAt?.toISOString() ?? null,
                    lastReminder,
                    isDuplicate: false,
                };
            }

            // Deduplication: informational, not a block
            const isDuplicate = seenPersonIds.has(row.personId);
            seenPersonIds.add(row.personId);

            return {
                chargeId,
                unitIdentifier: row.unitNumber,
                buildingAddress: row.buildingAddress,
                buildingId: row.buildingId,
                recipientPersonId: row.personId,
                recipientName: row.whatsappName,
                recipientPhone: normalizedPhone,
                blockReason: null,
                cooldownSince: null,
                lastReminder,
                isDuplicate,
            };
        });

        const sendableCount = preview.filter(p => p.blockReason === null).length;
        const blockedCount = preview.filter(p => p.blockReason !== null).length;

        return successResponse(preview, { sendableCount, blockedCount });
    } catch (e) {
        console.error('Reminders preview error', e);
        return errorResponse('Internal server error', 500, e);
    }
}
