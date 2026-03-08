import { NextRequest } from 'next/server'
import { db, people, unitRoles, units, buildings } from '@apro/db'
import { eq, desc, lt, and, ilike, or, isNull, inArray } from 'drizzle-orm'
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
            })
            .from(people)
            .where(and(...(filters as any[])))
            .limit(limit)
            .orderBy(desc(people.id))

        // Fetch active roles for all returned people in a single query.
        // Guard against empty array — inArray with [] produces invalid SQL.
        const rolesByPerson = new Map<string, { roleType: string; unitNumber: string; buildingName: string | null; buildingAddress: string | null }[]>()

        if (items.length > 0) {
            const personIds = items.map(p => p.id)
            const rolesRows = await db
                .select({
                    personId: unitRoles.personId,
                    roleType: unitRoles.roleType,
                    unitNumber: units.unitNumber,
                    buildingName: buildings.name,
                    buildingAddress: buildings.addressStreet,
                })
                .from(unitRoles)
                .innerJoin(units, eq(units.id, unitRoles.unitId))
                .innerJoin(buildings, eq(buildings.id, units.buildingId))
                .where(
                    and(
                        eq(unitRoles.tenantId, tenantId),
                        inArray(unitRoles.personId, personIds),
                        isNull(unitRoles.effectiveTo),
                    )
                )

            for (const row of rolesRows) {
                if (!rolesByPerson.has(row.personId)) rolesByPerson.set(row.personId, [])
                rolesByPerson.get(row.personId)!.push({
                    roleType: row.roleType,
                    unitNumber: row.unitNumber,
                    buildingName: row.buildingName,
                    buildingAddress: row.buildingAddress,
                })
            }
        }

        const result = items.map(p => ({
            ...p,
            activeRoles: rolesByPerson.get(p.id) ?? [],
        }))

        return successResponse(result, buildMeta(items, limit))
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
