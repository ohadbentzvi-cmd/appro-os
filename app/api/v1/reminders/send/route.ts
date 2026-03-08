import { NextRequest } from 'next/server';
import twilio from 'twilio';
import { db } from '@apro/db';
import { reminderLogs, appRoles, people, whatsappTemplates, charges, units, buildings } from '@apro/db/src/schema';
import { eq, and, inArray } from 'drizzle-orm';
import { getServerUser } from '@/lib/supabase/server';
import { validateBody } from '@/lib/api/validate';
import { errorResponse, successResponse } from '@/lib/api/response';
import { reminderSendSchema } from '@/lib/api/schemas';
import { normalizeIsraeliPhone } from '@/lib/reminders/phone';
import { formatHebrewMonthYear } from '@/lib/reminders/month';
import { resolveContentVariables } from '@/lib/reminders/templates';
import { type VariableMapping } from '@apro/db/src/schema';

// Fallback SID for tenants that have not synced any templates yet
const LEGACY_TEMPLATE_SID = 'HXfcc7c191dbf0377c007ea43633541d5f';

export async function POST(req: NextRequest) {
    try {
        const { user, tenantId } = await getServerUser();
        if (!user || !tenantId) return errorResponse('Unauthorized', 401);

        // Manager-only
        const [role] = await db.select().from(appRoles).where(
            and(
                eq(appRoles.supabaseUserId, user.id),
                eq(appRoles.tenantId, tenantId),
                eq(appRoles.role, 'manager'),
            )
        );
        if (!role) return errorResponse('Forbidden', 403);

        const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID;
        const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN;
        const TWILIO_FROM = process.env.TWILIO_WHATSAPP_FROM;
        if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_FROM) {
            return errorResponse('שירות שליחת ההודעות אינו מוגדר', 503);
        }

        const valid = await validateBody(req, reminderSendSchema);
        if ('error' in valid) return valid.error;
        const { messages, bulkBatchId, templateId } = valid.data;

        // Resolve the manager's person ID (used for sent_by_person_id)
        let sentByPersonId: string | null = null;
        const [senderPerson] = await db
            .select({ id: people.id })
            .from(people)
            .where(and(
                eq(people.supabaseUserId, user.id),
                eq(people.tenantId, tenantId),
            ));
        if (senderPerson) sentByPersonId = senderPerson.id;

        // --- Template resolution ---
        // 1. Explicit templateId from request
        // 2. Tenant's default template
        // 3. Legacy hard-coded SID (backward compat for tenants with no templates synced)
        let resolvedTemplate: typeof whatsappTemplates.$inferSelect | null = null;
        if (templateId) {
            const [t] = await db.select().from(whatsappTemplates)
                .where(and(eq(whatsappTemplates.id, templateId), eq(whatsappTemplates.tenantId, tenantId)));
            if (!t) return errorResponse('Template not found', 404);
            resolvedTemplate = t;
        } else {
            const [t] = await db.select().from(whatsappTemplates)
                .where(and(eq(whatsappTemplates.tenantId, tenantId), eq(whatsappTemplates.isDefault, true)));
            resolvedTemplate = t ?? null;
        }

        const templateSid = resolvedTemplate?.twilioTemplateSid ?? LEGACY_TEMPLATE_SID;
        const mapping: VariableMapping = resolvedTemplate?.variableMapping ?? {};
        const hasMapping = Object.keys(mapping).length > 0;

        // Batch-load charge context only when the mapping references charge/unit/building fields
        const chargeDataFields = new Set(['amount_due', 'due_date', 'building_name', 'unit_number']);
        const needsChargeData = hasMapping &&
            Object.values(mapping).some(f => f && chargeDataFields.has(f));

        type ChargeContext = { amountDue: number; dueDate: string | null; buildingName: string; unitNumber: string };
        const chargeContextMap = new Map<string, ChargeContext>();

        if (needsChargeData) {
            const chargeIds = messages.map(m => m.chargeId);
            const rows = await db
                .select({
                    chargeId: charges.id,
                    amountDue: charges.amountDue,
                    dueDate: charges.dueDate,
                    buildingName: buildings.name,
                    unitNumber: units.unitNumber,
                })
                .from(charges)
                .innerJoin(units, eq(units.id, charges.unitId))
                .innerJoin(buildings, eq(buildings.id, units.buildingId))
                .where(inArray(charges.id, chargeIds));
            for (const row of rows) {
                chargeContextMap.set(row.chargeId, {
                    amountDue: row.amountDue,
                    dueDate: row.dueDate,
                    buildingName: row.buildingName,
                    unitNumber: row.unitNumber,
                });
            }
        }

        const twilioClient = twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);

        const results: Array<{
            chargeId: string;
            status: 'sent' | 'failed';
            sid?: string;
            reason?: string;
        }> = [];

        // Process each message sequentially — error-isolated so one failure
        // does not abort the remaining messages.
        for (const msg of messages) {
            const normalizedPhone = normalizeIsraeliPhone(msg.recipientPhone);
            if (!normalizedPhone) {
                results.push({
                    chargeId: msg.chargeId,
                    status: 'failed',
                    reason: `Cannot normalize phone number: ${msg.recipientPhone}`,
                });
                continue;
            }

            // Resolve contentVariables from the template mapping, or fall back to
            // the legacy hard-coded schema ({1: name, 2: month}).
            let contentVariables: Record<string, string>;
            if (hasMapping) {
                const chargeCtx = chargeContextMap.get(msg.chargeId);
                contentVariables = resolveContentVariables(mapping, {
                    recipientName: msg.recipientName,
                    periodMonth: msg.periodMonth,
                    amountDue: chargeCtx?.amountDue,
                    dueDate: chargeCtx?.dueDate,
                    buildingName: chargeCtx?.buildingName,
                    unitNumber: chargeCtx?.unitNumber,
                });
            } else {
                contentVariables = {
                    '1': msg.recipientName,
                    '2': formatHebrewMonthYear(msg.periodMonth),
                };
            }

            // Insert log row as queued
            const [logRow] = await db.insert(reminderLogs).values({
                tenantId,
                chargeId: msg.chargeId,
                recipientPersonId: msg.recipientPersonId ?? null,
                recipientPhone: normalizedPhone,
                recipientNameUsed: msg.recipientName,
                status: 'queued',
                sentByPersonId,
                bulkBatchId: bulkBatchId ?? null,
                twilioTemplateSid: templateSid,
            }).returning({ id: reminderLogs.id });

            try {
                const twilioMsg = await twilioClient.messages.create({
                    contentSid: templateSid,
                    to: `whatsapp:${normalizedPhone}`,
                    from: TWILIO_FROM,
                    contentVariables: JSON.stringify(contentVariables),
                });

                await db.update(reminderLogs)
                    .set({ status: 'sent', twilioMessageSid: twilioMsg.sid })
                    .where(eq(reminderLogs.id, logRow.id));

                results.push({ chargeId: msg.chargeId, status: 'sent', sid: twilioMsg.sid });
            } catch (twilioErr: unknown) {
                const reason = (twilioErr as { message?: string })?.message ?? 'Twilio error';
                await db.update(reminderLogs)
                    .set({ status: 'failed', failureReason: reason })
                    .where(eq(reminderLogs.id, logRow.id));

                results.push({ chargeId: msg.chargeId, status: 'failed', reason });
            }
        }

        return successResponse(results);
    } catch (e) {
        console.error('Reminders send error', e);
        return errorResponse('Internal server error', 500, e);
    }
}
