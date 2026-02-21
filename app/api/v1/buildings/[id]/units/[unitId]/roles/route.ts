import { NextRequest } from 'next/server'
import { db, unitRoles } from '@apro/db'
import { eq, and, or, isNull, gte, sql } from 'drizzle-orm'
import { successResponse, errorResponse } from '@/lib/api/response'
import { validateBody } from '@/lib/api/validate'
import { createUnitRoleSchema } from '@/lib/api/schemas'

export async function POST(
    req: NextRequest,
    { params }: { params: Promise<{ id: string, unitId: string }> }
) {
    try {
        const { id: buildingId, unitId } = await params

        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
        if (!uuidRegex.test(buildingId) || !uuidRegex.test(unitId)) {
            return errorResponse('Invalid ID', 400)
        }

        const valid = await validateBody(req, createUnitRoleSchema)
        if ('error' in valid) return valid.error

        const data = valid.data
        const tenantId = process.env.APRO_TENANT_ID
        if (!tenantId) {
            console.error('APRO_TENANT_ID is not configured')
            return errorResponse('Internal server error', 500)
        }

        if (data.isFeePayer) {
            const activeFeePayer = await db
                .select({ id: unitRoles.id })
                .from(unitRoles)
                .where(
                    and(
                        eq(unitRoles.unitId, unitId),
                        eq(unitRoles.isFeePayer, true),
                        or(
                            isNull(unitRoles.effectiveTo),
                            gte(unitRoles.effectiveTo, sql`CURRENT_DATE`)
                        )
                    )
                )
                .limit(1)

            if (activeFeePayer.length > 0) {
                return errorResponse('DUPLICATE_FEE_PAYER', 409)
            }
        }

        const [newRole] = await db
            .insert(unitRoles)
            .values({
                tenantId,
                unitId,
                personId: data.personId,
                roleType: data.roleType,
                effectiveFrom: data.effectiveFrom,
                isFeePayer: data.isFeePayer,
            })
            .returning()

        return successResponse(newRole)
    } catch (e) {
        console.error('Unit Role POST error', e)
        return errorResponse('Internal server error', 500)
    }
}
