import { NextRequest } from 'next/server'
import { db, unitRoles } from '@apro/db'
import { eq, and, or, isNull, gte, sql } from 'drizzle-orm'
import { successResponse, errorResponse } from '@/lib/api/response'
import { validateBody } from '@/lib/api/validate'
import { updateUnitRoleSchema } from '@/lib/api/schemas'

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

        const valid = await validateBody(req, updateUnitRoleSchema)
        if ('error' in valid) return valid.error

        const data = valid.data

        const [role] = await db
            .select({ effectiveFrom: unitRoles.effectiveFrom })
            .from(unitRoles)
            .where(and(eq(unitRoles.id, roleId), eq(unitRoles.unitId, unitId)))

        if (!role) {
            return errorResponse('Unit Role not found', 404)
        }

        if (data.effectiveTo && new Date(data.effectiveTo) < new Date(data.effectiveFrom || role.effectiveFrom)) {
            return errorResponse('effectiveTo cannot be before effectiveFrom', 400)
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

            // If there's an active fee payer and it's NOT this role
            const otherFeePayer = activeFeePayer.find((r: any) => r.id !== roleId)

            if (otherFeePayer) {
                if (!data.replaceFeePayer) {
                    return errorResponse('DUPLICATE_FEE_PAYER', 409)
                } else {
                    // Turn off fee payer status for others
                    await db
                        .update(unitRoles)
                        .set({ isFeePayer: false })
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
                }
            }
        }

        const updateData: any = {}
        if (data.effectiveTo !== undefined) updateData.effectiveTo = data.effectiveTo
        if (data.effectiveFrom !== undefined) updateData.effectiveFrom = data.effectiveFrom
        if (data.roleType !== undefined) updateData.roleType = data.roleType
        if (data.isFeePayer !== undefined) updateData.isFeePayer = data.isFeePayer

        if (Object.keys(updateData).length === 0) {
            return successResponse(role)
        }

        const [updated] = await db
            .update(unitRoles)
            .set(updateData)
            .where(and(eq(unitRoles.id, roleId), eq(unitRoles.unitId, unitId)))
            .returning()

        return successResponse(updated)
    } catch (e) {
        console.error('Unit Role PATCH error', e)
        return errorResponse('Internal server error', 500)
    }
}
