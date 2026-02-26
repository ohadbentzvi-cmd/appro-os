import { NextRequest } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { db, people, appRoles, unitRoles } from '@apro/db'
import { eq, and, isNull, gte, sql } from 'drizzle-orm'
import { successResponse, errorResponse } from '@/lib/api/response'

export async function GET(req: NextRequest) {
    try {
        const supabase = await createSupabaseServerClient()
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) {
            return errorResponse('Unauthorized', 401)
        }

        const userId = user.id

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
        return await errorResponse('Internal server error', 500, e)
    }
}
