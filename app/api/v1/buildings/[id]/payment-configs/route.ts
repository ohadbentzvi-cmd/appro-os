import { NextRequest } from 'next/server'
import { db, unitPaymentConfig, units, charges } from '@apro/db'
import { eq, and, gte, inArray, asc, sql } from 'drizzle-orm'
import { z } from 'zod'
import { successResponse, errorResponse } from '@/lib/api/response'
import { getServerUser } from '@/lib/supabase/server'
import { validateBody } from '@/lib/api/validate'
import { generateForwardCharges } from '@/lib/charges/generateForwardCharges'

const bulkUpdateSchema = z.object({
    units: z.array(z.object({
        unitId: z.string().uuid(),
        monthlyAmountAgorot: z.number().int().min(1),
        billingDay: z.number().int().min(1).max(28),
    })).min(1),
    effectiveFrom: z.string().regex(/^\d{4}-\d{2}-01$/).optional(),
})

export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id: buildingId } = await params

        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
        if (!uuidRegex.test(buildingId)) return errorResponse('Invalid Building ID', 400)

        const { tenantId } = await getServerUser()
        if (!tenantId) return errorResponse('Unauthorized', 401)

        const rows = await db
            .select({
                unitId: units.id,
                identifier: units.unitNumber,
                floor: units.floor,
                monthlyAmount: unitPaymentConfig.monthlyAmount,
                billingDay: unitPaymentConfig.billingDay,
            })
            .from(units)
            .leftJoin(
                unitPaymentConfig,
                and(
                    eq(unitPaymentConfig.unitId, units.id),
                    eq(unitPaymentConfig.tenantId, tenantId),
                )
            )
            .where(and(eq(units.buildingId, buildingId), eq(units.tenantId, tenantId)))
            .orderBy(asc(units.floor), sql`length(${units.unitNumber})`, asc(units.unitNumber))

        const result = rows.map(row => ({
            unitId: row.unitId,
            identifier: row.identifier,
            floor: row.floor,
            config: row.monthlyAmount != null
                ? { monthlyAmount: row.monthlyAmount, billingDay: row.billingDay }
                : null,
        }))

        return successResponse(result)
    } catch (e) {
        console.error('Payment Configs GET error', e)
        return errorResponse('Internal server error', 500)
    }
}

export async function PATCH(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id: buildingId } = await params

        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
        if (!uuidRegex.test(buildingId)) return errorResponse('Invalid Building ID', 400)

        const { tenantId } = await getServerUser()
        if (!tenantId) return errorResponse('Unauthorized', 401)

        const valid = await validateBody(req, bulkUpdateSchema)
        if ('error' in valid) return valid.error

        const { units: unitUpdates, effectiveFrom } = valid.data

        // Verify all submitted unitIds belong to this building + tenant
        const buildingUnits = await db
            .select({ id: units.id })
            .from(units)
            .where(and(eq(units.buildingId, buildingId), eq(units.tenantId, tenantId)))

        const validUnitIds = new Set(buildingUnits.map(u => u.id))
        for (const u of unitUpdates) {
            if (!validUnitIds.has(u.unitId)) {
                return errorResponse(`Unit ${u.unitId} not found in this building`, 400)
            }
        }

        // Determine which units already have a config (update vs first-time)
        const existingConfigs = await db
            .select({ unitId: unitPaymentConfig.unitId })
            .from(unitPaymentConfig)
            .where(and(
                eq(unitPaymentConfig.tenantId, tenantId),
                inArray(unitPaymentConfig.unitId, unitUpdates.map(u => u.unitId)),
            ))
        const existingUnitIds = new Set(existingConfigs.map(c => c.unitId))

        await db.transaction(async (tx) => {
            for (const u of unitUpdates) {
                await tx
                    .insert(unitPaymentConfig)
                    .values({
                        tenantId,
                        unitId: u.unitId,
                        monthlyAmount: u.monthlyAmountAgorot,
                        billingDay: u.billingDay,
                    })
                    .onConflictDoUpdate({
                        target: unitPaymentConfig.unitId,
                        set: {
                            monthlyAmount: u.monthlyAmountAgorot,
                            billingDay: u.billingDay,
                        },
                    })

                const isUpdate = existingUnitIds.has(u.unitId)
                if (isUpdate && effectiveFrom) {
                    await tx
                        .delete(charges)
                        .where(and(
                            eq(charges.unitId, u.unitId),
                            eq(charges.tenantId, tenantId),
                            eq(charges.status, 'pending'),
                            gte(charges.periodMonth, effectiveFrom),
                        ))
                    await generateForwardCharges(tx, tenantId, u.unitId, new Date(effectiveFrom))
                } else if (!isUpdate) {
                    await generateForwardCharges(tx, tenantId, u.unitId)
                }
            }
        })

        return successResponse({ updated: unitUpdates.length })
    } catch (e) {
        console.error('Payment Configs PATCH error', e)
        return errorResponse('Internal server error', 500)
    }
}
