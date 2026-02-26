import { NextRequest } from 'next/server';
import { db, appRoles, chargeGenerationLog } from '@apro/db';
import { eq, desc } from 'drizzle-orm';
import { successResponse, errorResponse } from '@/lib/api/response';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export async function GET(req: NextRequest) {
    try {
        const supabase = await createSupabaseServerClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return errorResponse('Unauthorized', 401);
        }

        const [appRole] = await db.select().from(appRoles).where(eq(appRoles.supabaseUserId, user.id));

        if (!appRole || appRole.role !== 'manager') {
            return errorResponse('Forbidden: only managers can view logs', 403);
        }

        const tenantId = process.env.APRO_TENANT_ID;
        if (!tenantId) {
            return errorResponse('Internal server error: Missing tenant ID', 500);
        }

        const logs = await db
            .select()
            .from(chargeGenerationLog)
            .where(eq(chargeGenerationLog.tenantId, tenantId))
            .orderBy(desc(chargeGenerationLog.createdAt))
            .limit(24);

        return successResponse(logs);
    } catch (e: any) {
        console.error('Generation log GET error', e);
        return await errorResponse('Internal server error', 500, e);
    }
}
