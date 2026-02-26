import { NextRequest } from 'next/server'
import { db, buildings, units } from '@apro/db'
import { eq, and } from 'drizzle-orm'
import { successResponse, errorResponse } from '@/lib/api/response'
import { validateBody } from '@/lib/api/validate'
import { updateBuildingSchema } from '@/lib/api/schemas'

export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params

        // validate uuid
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
        if (!uuidRegex.test(id)) {
            return errorResponse('Invalid Building ID', 400)
        }

        const tenantId = process.env.APRO_TENANT_ID
        if (!tenantId) return await errorResponse('Internal server error', 500)
        const [building] = await db.select().from(buildings).where(and(eq(buildings.id, id), eq(buildings.tenantId, tenantId)))

        if (!building) {
            return errorResponse('Building not found', 404)
        }

        return successResponse(building)
    } catch (e) {
        console.error('Building GET error', e)
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
            return errorResponse('Invalid Building ID', 400)
        }

        const valid = await validateBody(req, updateBuildingSchema)
        if ('error' in valid) return valid.error

        const data = valid.data

        const updateData: any = {}
        if (data.address) updateData.addressStreet = data.address
        if (data.city) updateData.addressCity = data.city
        if (data.floors) updateData.numFloors = data.floors

        if (Object.keys(updateData).length === 0) {
            const tenantId = process.env.APRO_TENANT_ID
            if (!tenantId) return await errorResponse('Internal server error', 500)
            const [b] = await db.select().from(buildings).where(and(eq(buildings.id, id), eq(buildings.tenantId, tenantId)))
            if (!b) return errorResponse('Building not found', 404)
            return successResponse(b)
        }

        const [updated] = await db
            .update(buildings)
            .set(updateData)
            .where(eq(buildings.id, id))
            .returning()

        if (!updated) {
            return errorResponse('Building not found', 404)
        }

        return successResponse(updated)
    } catch (e) {
        console.error('Building PATCH error', e)
        return await errorResponse('Internal server error', 500, e)
    }
}

export async function DELETE(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params

        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
        if (!uuidRegex.test(id)) {
            return errorResponse('Invalid Building ID', 400)
        }

        const tenantId = process.env.APRO_TENANT_ID
        if (!tenantId) return await errorResponse('Internal server error', 500)
        const [building] = await db.select().from(buildings).where(and(eq(buildings.id, id), eq(buildings.tenantId, tenantId)))
        if (!building) {
            return errorResponse('Building not found', 404)
        }

        const unitList = await db.select().from(units).where(and(eq(units.buildingId, id), eq(units.tenantId, tenantId))).limit(1)
        if (unitList.length > 0) {
            return errorResponse('Building has active units', 400)
        }

        await db.delete(buildings).where(and(eq(buildings.id, id), eq(buildings.tenantId, tenantId)))

        return successResponse({ deleted: true })
    } catch (e) {
        console.error('Building DELETE error', e)
        return await errorResponse('Internal server error', 500, e)
    }
}
