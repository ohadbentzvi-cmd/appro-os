import { NextRequest } from 'next/server';
import twilio from 'twilio';
import { db } from '@apro/db';
import { reminderLogs, appRoles, people } from '@apro/db/src/schema';
import { eq, and } from 'drizzle-orm';
import { getServerUser } from '@/lib/supabase/server';
import { validateBody } from '@/lib/api/validate';
import { errorResponse, successResponse } from '@/lib/api/response';
import { reminderSendSchema } from '@/lib/api/schemas';
import { normalizeIsraeliPhone } from '@/lib/reminders/phone';
import { formatHebrewMonthYear } from '@/lib/reminders/month';

const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID;
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN;
const TWILIO_FROM = process.env.TWILIO_WHATSAPP_FROM;
const TWILIO_TEMPLATE_SID = 'HXfcc7c191dbf0377c007ea43633541d5f';

if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_FROM) {
    throw new Error('Missing required Twilio env vars: TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_WHATSAPP_FROM');
}

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

        const valid = await validateBody(req, reminderSendSchema);
        if ('error' in valid) return valid.error;
        const { messages, bulkBatchId } = valid.data;

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
            }).returning({ id: reminderLogs.id });

            try {
                const twilioMsg = await twilioClient.messages.create({
                    contentSid: TWILIO_TEMPLATE_SID,
                    to: `whatsapp:${normalizedPhone}`,
                    from: TWILIO_FROM,
                    contentVariables: JSON.stringify({
                        '1': msg.recipientName,
                        '2': formatHebrewMonthYear(msg.periodMonth),
                    }),
                });

                await db.update(reminderLogs)
                    .set({ status: 'sent', twilioMessageSid: twilioMsg.sid })
                    .where(eq(reminderLogs.id, logRow.id));

                results.push({ chargeId: msg.chargeId, status: 'sent', sid: twilioMsg.sid });
            } catch (twilioErr: any) {
                const reason = twilioErr?.message ?? 'Twilio error';
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
