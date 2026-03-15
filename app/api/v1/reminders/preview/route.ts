import { NextRequest } from 'next/server';
import { db } from '@apro/db';
import { charges, units, buildings, unitRoles, people, appRoles, whatsappTemplates } from '@apro/db/src/schema';
import { eq, and, inArray, isNull } from 'drizzle-orm';
import { getServerUser } from '@/lib/supabase/server';
import { validateBody } from '@/lib/api/validate';
import { errorResponse, successResponse } from '@/lib/api/response';
import { reminderPreviewSchema } from '@/lib/api/schemas';
import { normalizeIsraeliPhone } from '@/lib/reminders/phone';
import { getBlockedPersonIds } from '@/lib/reminders/cooldown';
import { getPreviewBlockReason } from '@/lib/reminders/block-reason';
import { resolveContentVariables, type ResolvedVarsContext } from '@/lib/reminders/templates';

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
        const { chargeIds, periodMonth, templateId } = valid.data;

        // Fetch charge + unit + building + fee payer for each chargeId in one query
        const rows = await db
            .select({
                chargeId: charges.id,
                unitId: units.id,
                unitNumber: units.unitNumber,
                buildingAddress: buildings.addressStreet,
                buildingName: buildings.name,
                buildingId: buildings.id,
                amountDue: charges.amountDue,
                dueDate: charges.dueDate,
                personId: people.id,
                whatsappName: people.whatsappName,
                availableOnWhatsapp: people.availableOnWhatsapp,
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
                    buildingName: null,
                    buildingId: null,
                    amountDue: null,
                    dueDate: null,
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

            // Shared charge-level fields available for all row-present branches
            const chargeFields = {
                buildingName: row.buildingName,
                amountDue: row.amountDue,
                dueDate: row.dueDate,
            };

            const blockReason = getPreviewBlockReason(row, blockedPersonIds);
            const normalizedPhone = row.phone ? normalizeIsraeliPhone(row.phone) : null;

            if (blockReason !== null) {
                const cooldownSince = blockReason === 'cooldown'
                    ? (lastReminderRows.find(r => r.chargeId === chargeId)?.sentAt?.toISOString() ?? null)
                    : null;
                return {
                    chargeId,
                    unitIdentifier: row.unitNumber,
                    buildingAddress: row.buildingAddress,
                    buildingId: row.buildingId,
                    ...chargeFields,
                    recipientPersonId: row.personId ?? null,
                    recipientName: row.whatsappName ?? null,
                    recipientPhone: normalizedPhone ?? row.phone ?? null,
                    blockReason,
                    cooldownSince,
                    lastReminder,
                    isDuplicate: false,
                };
            }

            // Deduplication: informational, not a block
            // row.personId is non-null here — getPreviewBlockReason returns no_fee_payer when null
            const isDuplicate = seenPersonIds.has(row.personId!);
            seenPersonIds.add(row.personId!);

            return {
                chargeId,
                unitIdentifier: row.unitNumber,
                buildingAddress: row.buildingAddress,
                buildingId: row.buildingId,
                ...chargeFields,
                recipientPersonId: row.personId,
                recipientName: row.whatsappName,
                recipientPhone: normalizedPhone,
                blockReason: null,
                cooldownSince: null,
                lastReminder,
                isDuplicate,
            };
        });

        // Resolve template variables if templateId was provided
        let templateForResolution: typeof whatsappTemplates.$inferSelect | null = null;
        if (templateId) {
            const [t] = await db.select().from(whatsappTemplates)
                .where(and(
                    eq(whatsappTemplates.id, templateId),
                    eq(whatsappTemplates.tenantId, tenantId),
                ));
            templateForResolution = t ?? null;
        }

        const enrichedPreview = preview.map(item => {
            if (!templateForResolution || item.blockReason !== null) {
                return { ...item, resolvedMessage: null, invalidSlots: [] as string[] };
            }

            const ctx: ResolvedVarsContext = {
                recipientName: item.recipientName ?? '',
                periodMonth,
                amountDue: item.amountDue ?? undefined,
                dueDate: item.dueDate ?? null,
                buildingName: item.buildingName ?? undefined,
                unitNumber: item.unitIdentifier ?? undefined,
            };

            const resolved = resolveContentVariables(templateForResolution.variableMapping ?? {}, ctx);
            const invalidSlots = Object.entries(resolved)
                .filter(([, v]) => v === '')
                .map(([k]) => k);

            const resolvedMessage = templateForResolution.body.replace(
                /\{\{(\d+)\}\}/g,
                (_, slot) => resolved[slot] ?? `{{${slot}}}`,
            );

            return { ...item, resolvedMessage, invalidSlots };
        });

        const sendableCount = enrichedPreview.filter(p => p.blockReason === null).length;
        const blockedCount = enrichedPreview.filter(p => p.blockReason !== null).length;

        return successResponse(enrichedPreview, { sendableCount, blockedCount });
    } catch (e) {
        console.error('Reminders preview error', e);
        return errorResponse('Internal server error', 500, e);
    }
}
