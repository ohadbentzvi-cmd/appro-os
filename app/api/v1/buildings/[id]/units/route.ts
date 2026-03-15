import { NextRequest } from 'next/server'
import { db, units, unitRoles } from '@apro/db'
import { eq, and, sql, asc } from 'drizzle-orm'
import { successResponse, errorResponse } from '@/lib/api/response'
import { getServerUser } from '@/lib/supabase/server'
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

        const { tenantId } = await getServerUser()

        if (!tenantId) {
            return await errorResponse('Unauthorized', 401)
        }

        const items = await db
            .select({
                id: units.id,
                tenantId: units.tenantId,
                buildingId: units.buildingId,
                unitNumber: units.unitNumber,
                floor: units.floor,
                createdAt: units.createdAt,
                ownerName: sql<string | null>`(
          SELECT p.full_name FROM ${unitRoles} ur
          JOIN people p ON p.id = ur.person_id
          WHERE ur.unit_id = "units"."id" AND ur.role_type = 'owner'
            AND (ur.effective_to IS NULL OR ur.effective_to >= CURRENT_DATE)
          ORDER BY ur.created_at DESC LIMIT 1
        )`,
                ownerPersonId: sql<string | null>`(
          SELECT ur.person_id::text FROM ${unitRoles} ur
          WHERE ur.unit_id = "units"."id" AND ur.role_type = 'owner'
            AND (ur.effective_to IS NULL OR ur.effective_to >= CURRENT_DATE)
          ORDER BY ur.created_at DESC LIMIT 1
        )`,
                ownerPhone: sql<string | null>`(
          SELECT p.phone FROM ${unitRoles} ur
          JOIN people p ON p.id = ur.person_id
          WHERE ur.unit_id = "units"."id" AND ur.role_type = 'owner'
            AND (ur.effective_to IS NULL OR ur.effective_to >= CURRENT_DATE)
          ORDER BY ur.created_at DESC LIMIT 1
        )`,
                ownerEmail: sql<string | null>`(
          SELECT p.email FROM ${unitRoles} ur
          JOIN people p ON p.id = ur.person_id
          WHERE ur.unit_id = "units"."id" AND ur.role_type = 'owner'
            AND (ur.effective_to IS NULL OR ur.effective_to >= CURRENT_DATE)
          ORDER BY ur.created_at DESC LIMIT 1
        )`,
                tenantName: sql<string | null>`(
          SELECT p.full_name FROM ${unitRoles} ur
          JOIN people p ON p.id = ur.person_id
          WHERE ur.unit_id = "units"."id" AND ur.role_type = 'tenant'
            AND (ur.effective_to IS NULL OR ur.effective_to >= CURRENT_DATE)
          ORDER BY ur.created_at DESC LIMIT 1
        )`,
                tenantPersonId: sql<string | null>`(
          SELECT ur.person_id::text FROM ${unitRoles} ur
          WHERE ur.unit_id = "units"."id" AND ur.role_type = 'tenant'
            AND (ur.effective_to IS NULL OR ur.effective_to >= CURRENT_DATE)
          ORDER BY ur.created_at DESC LIMIT 1
        )`,
                tenantPhone: sql<string | null>`(
          SELECT p.phone FROM ${unitRoles} ur
          JOIN people p ON p.id = ur.person_id
          WHERE ur.unit_id = "units"."id" AND ur.role_type = 'tenant'
            AND (ur.effective_to IS NULL OR ur.effective_to >= CURRENT_DATE)
          ORDER BY ur.created_at DESC LIMIT 1
        )`,
                tenantEmail: sql<string | null>`(
          SELECT p.email FROM ${unitRoles} ur
          JOIN people p ON p.id = ur.person_id
          WHERE ur.unit_id = "units"."id" AND ur.role_type = 'tenant'
            AND (ur.effective_to IS NULL OR ur.effective_to >= CURRENT_DATE)
          ORDER BY ur.created_at DESC LIMIT 1
        )`
            })
            .from(units)
            .where(and(eq(units.buildingId, buildingId), eq(units.tenantId, tenantId)))
            .orderBy(asc(units.floor), sql`length(${units.unitNumber})`, asc(units.unitNumber))

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
        const { tenantId } = await getServerUser()

        if (!tenantId) {
            return await errorResponse('Unauthorized', 401)
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
