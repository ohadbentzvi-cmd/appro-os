import { NextRequest } from 'next/server';
import { db } from '@apro/db';
import { whatsappTemplates, appRoles } from '@apro/db/src/schema';
import { eq, and, desc } from 'drizzle-orm';
import { getServerUser } from '@/lib/supabase/server';
import { errorResponse, successResponse } from '@/lib/api/response';

export async function GET(_req: NextRequest) {
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

        const templates = await db
            .select()
            .from(whatsappTemplates)
            .where(eq(whatsappTemplates.tenantId, tenantId))
            .orderBy(desc(whatsappTemplates.isDefault), whatsappTemplates.name);

        return successResponse(templates);
    } catch (e) {
        console.error('Templates list error', e);
        return errorResponse('Internal server error', 500, e);
    }
}
