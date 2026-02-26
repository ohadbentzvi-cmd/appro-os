import { NextRequest } from 'next/server'
import { db, units, unitRoles, people } from '@apro/db'
import { eq, and, desc } from 'drizzle-orm'
import { successResponse, errorResponse } from '@/lib/api/response'
import { validateBody } from '@/lib/api/validate'
import { updateUnitSchema } from '@/lib/api/schemas'

export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ id: string, unitId: string }> }
) {
    try {
        const { id: buildingId, unitId } = await params

        const tenantId = process.env.APRO_TENANT_ID;
        if (!tenantId) return errorResponse('Internal server error', 500)

        // validate uuid
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
        if (!uuidRegex.test(buildingId) || !uuidRegex.test(unitId)) {
            return errorResponse('Invalid ID', 400)
        }

        const [unit] = await db.select().from(units).where(
            and(eq(units.id, unitId), eq(units.buildingId, buildingId), eq(units.tenantId, tenantId))
        )

        if (!unit) {
            return errorResponse('Unit not found', 404)
        }

        // fetch roles joined with people
        const roles = await db
            .select({
                id: unitRoles.id,
                roleType: unitRoles.roleType,
                effectiveFrom: unitRoles.effectiveFrom,
                effectiveTo: unitRoles.effectiveTo,
                isFeePayer: unitRoles.isFeePayer,
                person: {
                    id: people.id,
                    fullName: people.fullName,
                    email: people.email,
                    phone: people.phone
                }
            })
            .from(unitRoles)
            .innerJoin(people, eq(people.id, unitRoles.personId))
            .where(eq(unitRoles.unitId, unitId))
            .orderBy(desc(unitRoles.effectiveFrom))

        return successResponse({ ...unit, roles })
    } catch (e) {
        console.error('Unit GET error', e)
        return await errorResponse('Internal server error', 500, e)
    }
}

export async function PATCH(
    req: NextRequest,
    { params }: { params: Promise<{ id: string, unitId: string }> }
) {
    try {
        const { id: buildingId, unitId } = await params

        const tenantId = process.env.APRO_TENANT_ID;
        if (!tenantId) return errorResponse('Internal server error', 500)

        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
        if (!uuidRegex.test(buildingId) || !uuidRegex.test(unitId)) {
            return errorResponse('Invalid ID', 400)
        }

        const valid = await validateBody(req, updateUnitSchema)
        if ('error' in valid) return valid.error

        const data = valid.data

        const updateData: any = {}
        if (data.unitNumber) updateData.unitNumber = data.unitNumber
        if (data.floor !== undefined) updateData.floor = data.floor

        if (Object.keys(updateData).length === 0) {
            const [u] = await db.select().from(units).where(
                and(eq(units.id, unitId), eq(units.buildingId, buildingId), eq(units.tenantId, tenantId))
            )
            if (!u) return errorResponse('Unit not found', 404)
            return successResponse(u)
        }

        const [updated] = await db
            .update(units)
            .set(updateData)
            .where(and(eq(units.id, unitId), eq(units.buildingId, buildingId), eq(units.tenantId, tenantId)))
            .returning()

        if (!updated) {
            return errorResponse('Unit not found', 404)
        }

        return successResponse(updated)
    } catch (e) {
        console.error('Unit PATCH error', e)
        return await errorResponse('Internal server error', 500, e)
    }
}
