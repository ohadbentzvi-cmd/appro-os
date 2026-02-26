import { NextRequest } from 'next/server'
import { db, people, unitRoles } from '@apro/db'
import { eq, sql, desc, lt, and, ilike, or } from 'drizzle-orm'
import { successResponse, errorResponse } from '@/lib/api/response'
import { validateBody } from '@/lib/api/validate'
import { createPersonSchema } from '@/lib/api/schemas'
import { parseCursor, buildMeta } from '@/lib/api/pagination'

export async function GET(req: NextRequest) {
    try {
        const { cursor, limit } = parseCursor(req.nextUrl.searchParams)
        const search = req.nextUrl.searchParams.get('search')

        const filters = []

        if (cursor) {
            filters.push(lt(people.id, cursor))
        }

        if (search) {
            filters.push(
                or(
                    ilike(people.fullName, `%${search}%`),
                    ilike(people.email, `%${search}%`),
                    ilike(people.phone, `%${search}%`)
                )
            )
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
            .where(filters.length > 0 ? and(...filters) : undefined)
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
        const tenantId = process.env.APRO_TENANT_ID
        if (!tenantId) {
            console.error('APRO_TENANT_ID is not configured')
            return await errorResponse('Internal server error', 500)
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
