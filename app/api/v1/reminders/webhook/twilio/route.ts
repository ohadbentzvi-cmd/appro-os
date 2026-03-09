// DEPLOYMENT NOTE:
// Register this URL in the Twilio Console under the WhatsApp sender's
// "Status Callback URL" field:
//   https://<your-railway-domain>/api/v1/reminders/webhook/twilio
//
// Twilio signs every request using TWILIO_AUTH_TOKEN via an HMAC-SHA1
// signature in the X-Twilio-Signature header. No separate secret needed.
// This endpoint does NOT use Supabase session auth — it is inbound from Twilio.

import { NextRequest } from 'next/server';
import { validateRequest } from 'twilio';
import { db } from '@apro/db';
import { reminderLogs } from '@apro/db/src/schema';
import { eq } from 'drizzle-orm';

export async function POST(req: NextRequest) {
    try {
        const authToken = process.env.TWILIO_AUTH_TOKEN;
        if (!authToken) {
            console.error('Twilio webhook: TWILIO_AUTH_TOKEN is not set');
            return new Response('Internal Server Error', { status: 500 });
        }

        // Reconstruct the full URL Twilio signed (must match exactly)
        const url = req.url;

        // Twilio sends application/x-www-form-urlencoded
        const text = await req.text();
        const params = Object.fromEntries(new URLSearchParams(text)) as Record<string, string>;

        const twilioSignature = req.headers.get('x-twilio-signature') ?? '';

        if (!validateRequest(authToken, twilioSignature, url, params)) {
            console.warn('Twilio webhook: invalid signature');
            return new Response('Forbidden', { status: 403 });
        }

        const { MessageSid, MessageStatus, ErrorCode } = params;

        if (!MessageSid) {
            // Malformed request — still return 200 so Twilio doesn't retry
            console.warn('Twilio webhook: missing MessageSid');
            return new Response('OK', { status: 200 });
        }

        // Map Twilio status to our enum
        let status: 'delivered' | 'failed' | null = null;
        if (MessageStatus === 'delivered') status = 'delivered';
        else if (MessageStatus === 'failed' || MessageStatus === 'undelivered') status = 'failed';

        if (!status) {
            // Intermediate status (e.g. 'sent', 'queued') — nothing to update
            return new Response('OK', { status: 200 });
        }

        const [matched] = await db
            .select({ id: reminderLogs.id })
            .from(reminderLogs)
            .where(eq(reminderLogs.twilioMessageSid, MessageSid));

        if (!matched) {
            // Unknown SID — log and discard; Twilio may retry, but we don't crash
            console.warn(`Twilio webhook: unknown MessageSid ${MessageSid}`);
            return new Response('OK', { status: 200 });
        }

        const updateValues: Record<string, unknown> = { status };
        if (status === 'delivered') {
            updateValues.deliveredAt = new Date();
        } else {
            updateValues.failureReason = ErrorCode
                ? `Twilio error code: ${ErrorCode}`
                : `Twilio status: ${MessageStatus}`;
        }

        await db.update(reminderLogs)
            .set(updateValues)
            .where(eq(reminderLogs.id, matched.id));

        return new Response('OK', { status: 200 });
    } catch (e) {
        console.error('Twilio webhook error', e);
        // Still return 200 — if we return 5xx, Twilio retries indefinitely
        return new Response('OK', { status: 200 });
    }
}
