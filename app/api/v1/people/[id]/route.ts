import { NextRequest } from 'next/server'
import { db, people, unitRoles, units, buildings } from '@apro/db'
import { eq, and } from 'drizzle-orm'
import { successResponse, errorResponse } from '@/lib/api/response'
import { validateBody } from '@/lib/api/validate'
import { updatePersonSchema } from '@/lib/api/schemas'

export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params

        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
        if (!uuidRegex.test(id)) {
            return errorResponse('Invalid Person ID', 400)
        }

        const tenantId = process.env.APRO_TENANT_ID
        if (!tenantId) return await errorResponse('Internal server error', 500)

        const [person] = await db.select().from(people).where(and(eq(people.id, id), eq(people.tenantId, tenantId)))

        if (!person) {
            return errorResponse('Person not found', 404)
        }

        const rows = await db
            .select({
                id: unitRoles.id,
                roleType: unitRoles.roleType,
                effectiveFrom: unitRoles.effectiveFrom,
                effectiveTo: unitRoles.effectiveTo,
                isFeePayer: unitRoles.isFeePayer,
                unitId: units.id,
                unitNumber: units.unitNumber,
                floor: units.floor,
                buildingId: buildings.id,
                buildingName: buildings.name,
                addressStreet: buildings.addressStreet,
                addressCity: buildings.addressCity
            })
            .from(unitRoles)
            .innerJoin(units, eq(units.id, unitRoles.unitId))
            .innerJoin(buildings, eq(buildings.id, units.buildingId))
            .where(eq(unitRoles.personId, id))

        const roles = rows.map(r => ({
            id: r.id,
            roleType: r.roleType,
            effectiveFrom: r.effectiveFrom,
            effectiveTo: r.effectiveTo,
            isFeePayer: r.isFeePayer,
            unit: {
                id: r.unitId,
                unitNumber: r.unitNumber,
                floor: r.floor,
                building: {
                    id: r.buildingId,
                    name: r.buildingName,
                    addressStreet: r.addressStreet,
                    addressCity: r.addressCity
                }
            }
        }))

        return successResponse({ ...person, roles })
    } catch (e) {
        console.error('Person GET error', e)
        return await errorResponse('Internal server error', 500, e)
    }
}

export async function PATCH(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params

        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
        if (!uuidRegex.test(id)) {
            return errorResponse('Invalid Person ID', 400)
        }

        const valid = await validateBody(req, updatePersonSchema)
        if ('error' in valid) return valid.error

        const data = valid.data

        const updateData: any = {}
        if (data.fullName !== undefined) updateData.fullName = data.fullName
        if (data.email !== undefined) updateData.email = data.email
        if (data.phone !== undefined) updateData.phone = data.phone

        if (Object.keys(updateData).length === 0) {
            const [p] = await db.select().from(people).where(and(eq(people.id, id), eq(people.tenantId, tenantId)))
            if (!p) return errorResponse('Person not found', 404)
            return successResponse(p)
        }

        const [updated] = await db
            .update(people)
            .set(updateData)
            .where(eq(people.id, id))
            .returning()

        if (!updated) {
            return errorResponse('Person not found', 404)
        }

        return successResponse(updated)
    } catch (e) {
        console.error('Person PATCH error', e)
        return await errorResponse('Internal server error', 500, e)
    }
}
