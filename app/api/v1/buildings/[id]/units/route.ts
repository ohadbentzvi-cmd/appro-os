import { NextRequest } from 'next/server'
import { db, units, unitRoles } from '@apro/db'
import { eq, sql } from 'drizzle-orm'
import { successResponse, errorResponse } from '@/lib/api/response'
import { validateBody } from '@/lib/api/validate'
import { createUnitSchema } from '@/lib/api/schemas'

export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id: buildingId } = await params

        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
        if (!uuidRegex.test(buildingId)) {
            return errorResponse('Invalid Building ID', 400)
        }

        const items = await db
            .select({
                id: units.id,
                tenantId: units.tenantId,
                buildingId: units.buildingId,
                unitNumber: units.unitNumber,
                floor: units.floor,
                createdAt: units.createdAt,
                activeRolesCount: sql<number>`(
          SELECT count(*)::int 
          FROM ${unitRoles} 
          WHERE ${unitRoles.unitId} = "units"."id"
            AND (${unitRoles.effectiveTo} IS NULL OR ${unitRoles.effectiveTo} >= CURRENT_DATE)
        )`,
                activeOccupantName: sql<string | null>`(
          SELECT p.full_name
          FROM ${unitRoles} ur
          JOIN people p ON p.id = ur.person_id
          WHERE ur.unit_id = "units"."id"
            AND (ur.effective_to IS NULL OR ur.effective_to >= CURRENT_DATE)
          ORDER BY ur.created_at DESC
          LIMIT 1
        )`,
                activeRoleType: sql<string | null>`(
          SELECT role_type
          FROM ${unitRoles}
          WHERE unit_id = "units"."id"
            AND (effective_to IS NULL OR effective_to >= CURRENT_DATE)
          ORDER BY created_at DESC
          LIMIT 1
        )`
            })
            .from(units)
            .where(eq(units.buildingId, buildingId))

        return successResponse(items)
    } catch (e) {
        console.error('Units GET error', e)
        return await errorResponse('Internal server error', 500)
    }
}

export async function POST(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id: buildingId } = await params

        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
        if (!uuidRegex.test(buildingId)) {
            return errorResponse('Invalid Building ID', 400)
        }

        const valid = await validateBody(req, createUnitSchema)
        if ('error' in valid) return valid.error

        const data = valid.data
        const tenantId = process.env.APRO_TENANT_ID
        if (!tenantId) {
            console.error('APRO_TENANT_ID is not configured')
            return await errorResponse('Internal server error', 500)
        }

        const [newUnit] = await db
            .insert(units)
            .values({
                tenantId,
                buildingId,
                unitNumber: data.unitNumber,
                floor: data.floor,
            })
            .returning()

        return successResponse(newUnit)
    } catch (e) {
        console.error('Units POST error', e)
        return await errorResponse('Internal server error', 500)
    }
}
