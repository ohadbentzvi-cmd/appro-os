import { NextRequest } from 'next/server';
import { db } from '@apro/db';
import { whatsappTemplates, appRoles } from '@apro/db/src/schema';
import { eq, and } from 'drizzle-orm';
import { getServerUser } from '@/lib/supabase/server';
import { validateBody } from '@/lib/api/validate';
import { errorResponse, successResponse } from '@/lib/api/response';
import { updateTemplateSchema } from '@/lib/api/schemas';

export async function PATCH(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
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

        const { id } = await params;

        const valid = await validateBody(req, updateTemplateSchema);
        if ('error' in valid) return valid.error;
        const { name, isDefault, variableMapping } = valid.data;

        // Verify template belongs to this tenant
        const [template] = await db
            .select({ id: whatsappTemplates.id })
            .from(whatsappTemplates)
            .where(and(eq(whatsappTemplates.id, id), eq(whatsappTemplates.tenantId, tenantId)));
        if (!template) return errorResponse('Not found', 404);

        if (isDefault) {
            // Transaction: unset current default then set new one.
            // The partial unique index (WHERE is_default = true) enforces this at DB level.
            await db.transaction(async (tx) => {
                await tx
                    .update(whatsappTemplates)
                    .set({ isDefault: false, updatedAt: new Date() })
                    .where(
                        and(
                            eq(whatsappTemplates.tenantId, tenantId),
                            eq(whatsappTemplates.isDefault, true),
                        )
                    );
                await tx
                    .update(whatsappTemplates)
                    .set({ isDefault: true, updatedAt: new Date() })
                    .where(and(eq(whatsappTemplates.id, id), eq(whatsappTemplates.tenantId, tenantId)));
            });
        }

        const updates: Record<string, unknown> = { updatedAt: new Date() };
        if (name !== undefined) {
            updates.name = name;
            updates.nameOverridden = true;
        }
        if (variableMapping !== undefined) {
            updates.variableMapping = variableMapping;
        }

        // Skip the extra update if we only changed isDefault (already handled in transaction)
        if (Object.keys(updates).length > 1 || !isDefault) {
            await db
                .update(whatsappTemplates)
                .set(updates)
                .where(and(eq(whatsappTemplates.id, id), eq(whatsappTemplates.tenantId, tenantId)));
        }

        const [updated] = await db
            .select()
            .from(whatsappTemplates)
            .where(and(eq(whatsappTemplates.id, id), eq(whatsappTemplates.tenantId, tenantId)));

        return successResponse(updated);
    } catch (e) {
        console.error('Template update error', e);
        return errorResponse('Internal server error', 500, e);
    }
}
