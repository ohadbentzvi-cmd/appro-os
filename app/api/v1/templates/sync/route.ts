import { NextRequest } from 'next/server';
import twilio from 'twilio';
import { sql } from 'drizzle-orm';
import { db } from '@apro/db';
import { whatsappTemplates, appRoles } from '@apro/db/src/schema';
import { eq, and, notInArray } from 'drizzle-orm';
import { getServerUser } from '@/lib/supabase/server';
import { errorResponse, successResponse } from '@/lib/api/response';
import { parseVariables, extractTwilioBody } from '@/lib/reminders/templates';
import { type VariableMapping } from '@apro/db/src/schema';

export async function POST(_req: NextRequest) {
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

        const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID;
        const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN;
        if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN) {
            return errorResponse('שירות שליחת ההודעות אינו מוגדר', 503);
        }

        const twilioClient = twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);
        const contents = await twilioClient.content.v1.contents.list();

        if (contents.length === 0) {
            return successResponse({ synced: 0, templates: [] });
        }

        const now = new Date();

        const values = contents.map(content => {
            const body = extractTwilioBody(content.types as Record<string, unknown>);

            // Prefer Twilio's own `variables` map (covers all slots across header,
            // body, footer) over parsing the body text alone. Fall back to body
            // parsing if the content resource doesn't expose variables.
            const twilioVarKeys = Object.keys(content.variables ?? {});
            const variables = twilioVarKeys.length > 0
                ? twilioVarKeys.sort((a, b) => Number(a) - Number(b))
                : parseVariables(body);

            return {
                tenantId,
                twilioTemplateSid: content.sid,
                name: content.friendlyName ?? content.sid,
                nameOverridden: false as boolean,
                body,
                variables,
                variableMapping: {} as VariableMapping,
                isDefault: false as boolean,
                lastSyncedAt: now,
            };
        });

        const synced = await db
            .insert(whatsappTemplates)
            .values(values)
            .onConflictDoUpdate({
                target: [whatsappTemplates.tenantId, whatsappTemplates.twilioTemplateSid],
                set: {
                    body: sql`excluded.body`,
                    variables: sql`excluded.variables`,
                    lastSyncedAt: sql`excluded.last_synced_at`,
                    updatedAt: sql`now()`,
                    // Preserve manager's custom name if they've overridden it
                    name: sql`CASE WHEN whatsapp_templates.name_overridden
                                   THEN whatsapp_templates.name
                                   ELSE excluded.name END`,
                },
            })
            .returning({ id: whatsappTemplates.id });

        // Remove templates that no longer exist in Twilio.
        // Only runs when Twilio returned at least one template to avoid
        // wiping everything on a transient API error.
        const syncedSids = contents.map(c => c.sid);
        await db
            .delete(whatsappTemplates)
            .where(
                and(
                    eq(whatsappTemplates.tenantId, tenantId),
                    notInArray(whatsappTemplates.twilioTemplateSid, syncedSids),
                )
            );

        const templates = await db
            .select()
            .from(whatsappTemplates)
            .where(eq(whatsappTemplates.tenantId, tenantId));

        return successResponse({ synced: synced.length, templates });
    } catch (e) {
        console.error('Templates sync error', e);
        return errorResponse('Internal server error', 500, e);
    }
}
