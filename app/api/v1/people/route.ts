import { NextRequest } from 'next/server'
import { db, people, unitRoles } from '@apro/db'
import { eq, sql, desc, lt, and, ilike, or } from 'drizzle-orm'
import { successResponse, errorResponse } from '@/lib/api/response'
import { getServerUser } from '@/lib/supabase/server'
import { validateBody } from '@/lib/api/validate'
import { createPersonSchema } from '@/lib/api/schemas'
import { parseCursor, buildMeta } from '@/lib/api/pagination'

export async function GET(req: NextRequest) {
    try {
        const { tenantId } = await getServerUser()

        if (!tenantId) {
            return await errorResponse('Unauthorized', 401)
        }

        const { cursor, limit } = parseCursor(req.nextUrl.searchParams)
        const search = req.nextUrl.searchParams.get('search')

        const filters = [eq(people.tenantId, tenantId)]

        if (cursor) {
            filters.push(lt(people.id, cursor))
        }

        if (search) {
            const searchFilter = or(
                ilike(people.fullName, `%${search}%`),
                ilike(people.email, `%${search}%`),
                ilike(people.phone, `%${search}%`)
            )
            if (searchFilter) {
                filters.push(searchFilter)
            }
        }

        const items = await db
            .select({
                id: people.id,
                tenantId: people.tenantId,
                fullName: people.fullName,
                email: people.email,
                phone: people.phone,
                createdAt: people.createdAt,
                activeRolesCount: sql<number>`(
          SELECT count(*)::int 
          FROM ${unitRoles} 
          WHERE ${unitRoles.personId} = ${people.id}
            AND (${unitRoles.effectiveTo} IS NULL OR ${unitRoles.effectiveTo} >= CURRENT_DATE)
        )`
            })
            .from(people)
            .where(and(...(filters as any[])))
            .limit(limit)
            .orderBy(desc(people.id))

        return successResponse(items, buildMeta(items, limit))
    } catch (e) {
        console.error('People GET error', e)
        return await errorResponse('Internal server error', 500)
    }
}

export async function POST(req: NextRequest) {
    try {
        const valid = await validateBody(req, createPersonSchema)
        if ('error' in valid) return valid.error

        const data = valid.data
        const { tenantId } = await getServerUser()

        if (!tenantId) {
            return await errorResponse('Unauthorized', 401)
        }

        const [newPerson] = await db
            .insert(people)
            .values({
                tenantId,
                fullName: data.fullName,
                email: data.email,
                phone: data.phone,
            })
            .returning()

        return successResponse(newPerson)
    } catch (e) {
        console.error('People POST error', e)
        return await errorResponse('Internal server error', 500)
    }
}
