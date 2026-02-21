import { NextRequest } from 'next/server'
import { db, unitRoles } from '@apro/db'
import { eq, and } from 'drizzle-orm'
import { successResponse, errorResponse } from '@/lib/api/response'
import { validateBody } from '@/lib/api/validate'
import { closeUnitRoleSchema } from '@/lib/api/schemas'

export async function PATCH(
    req: NextRequest,
    { params }: { params: Promise<{ id: string, unitId: string, roleId: string }> }
) {
    try {
        const { id: buildingId, unitId, roleId } = await params

        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
        if (!uuidRegex.test(buildingId) || !uuidRegex.test(unitId) || !uuidRegex.test(roleId)) {
            return errorResponse('Invalid ID', 400)
        }

        const valid = await validateBody(req, closeUnitRoleSchema)
        if ('error' in valid) return valid.error

        const data = valid.data

        const [role] = await db
            .select({ effectiveFrom: unitRoles.effectiveFrom })
            .from(unitRoles)
            .where(and(eq(unitRoles.id, roleId), eq(unitRoles.unitId, unitId)))

        if (!role) {
            return errorResponse('Unit Role not found', 404)
        }

        // Validate effectiveTo is not before effectiveFrom
        if (new Date(data.effectiveTo) < new Date(role.effectiveFrom)) {
            return errorResponse('effectiveTo cannot be before effectiveFrom', 400)
        }

        const [updated] = await db
            .update(unitRoles)
            .set({ effectiveTo: data.effectiveTo })
            .where(and(eq(unitRoles.id, roleId), eq(unitRoles.unitId, unitId)))
            .returning()

        return successResponse(updated)
    } catch (e) {
        console.error('Unit Role PATCH error', e)
        return errorResponse('Internal server error', 500)
    }
}
