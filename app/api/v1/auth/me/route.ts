import { NextRequest } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { db, people, appRoles, unitRoles } from '@apro/db'
import { eq, and, isNull, gte, sql } from 'drizzle-orm'
import { successResponse, errorResponse } from '@/lib/api/response'

export async function GET(req: NextRequest) {
    try {
        const supabase = createRouteHandlerClient({ cookies })
        const { data: { session } } = await supabase.auth.getSession()

        if (!session) {
            return errorResponse('Unauthorized', 401)
        }

        const userId = session.user.id

        const [person] = await db.select().from(people).where(eq(people.supabaseUserId, userId))

        if (!person) {
            return errorResponse('User profile not found', 404)
        }

        const [appRole] = await db.select().from(appRoles).where(eq(appRoles.supabaseUserId, userId))

        const activeUnitRoles = await db
            .select()
            .from(unitRoles)
            .where(
                and(
                    eq(unitRoles.personId, person.id),
                    eq(unitRoles.tenantId, person.tenantId),
                    sql`${unitRoles.effectiveTo} IS NULL OR ${unitRoles.effectiveTo} >= CURRENT_DATE`
                )
            )

        return successResponse({
            profile: person,
            appRole: appRole ?? null,
            unitRoles: activeUnitRoles
        })
    } catch (e) {
        console.error('Auth GET me error', e)
        return errorResponse('Internal server error', 500)
    }
}
