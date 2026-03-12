import { NextRequest } from 'next/server'
import { db, unitPaymentConfig, units } from '@apro/db'
import { eq, and } from 'drizzle-orm'
import { successResponse, errorResponse } from '@/lib/api/response'
import { getServerUser } from '@/lib/supabase/server'
import { validateBody } from '@/lib/api/validate'
import { paymentConfigSchema } from '@/lib/api/schemas'
import * as Sentry from '@sentry/nextjs';

export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ id: string, unitId: string }> }
) {
    try {
        const { id: buildingId, unitId } = await params

        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
        if (!uuidRegex.test(buildingId) || !uuidRegex.test(unitId)) {
            return errorResponse('Invalid ID', 400)
        }

        const { tenantId } = await getServerUser()

        if (!tenantId) {
            return await errorResponse('Unauthorized', 401)
        }

        const [unit] = await db.select({ id: units.id }).from(units).where(
            and(eq(units.id, unitId), eq(units.buildingId, buildingId), eq(units.tenantId, tenantId))
        )

        if (!unit) {
            return errorResponse('Unit not found', 404)
        }

        const [config] = await db.select()
            .from(unitPaymentConfig)
            .where(
                and(
                    eq(unitPaymentConfig.unitId, unitId),
                    eq(unitPaymentConfig.tenantId, tenantId),
                )
            )
            .limit(1)

        return successResponse(config || null)
    } catch (e) {
        console.error('Payment Config GET error', e)
        return await errorResponse('Internal server error', 500, e, req)
    }
}

export async function PATCH(
    req: NextRequest,
    { params }: { params: Promise<{ id: string, unitId: string }> }
) {
    try {
        const { id: buildingId, unitId } = await params

        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
        if (!uuidRegex.test(buildingId) || !uuidRegex.test(unitId)) {
            return errorResponse('Invalid ID', 400)
        }

        const valid = await validateBody(req, paymentConfigSchema)
        if ('error' in valid) return valid.error

        const data = valid.data
        const { tenantId } = await getServerUser()

        Sentry.addBreadcrumb({ category: 'finance', message: `Setting config for unit ${unitId}`, level: 'info' });
        if (!tenantId) {
            return await errorResponse('Unauthorized', 401)
        }

        const [unit] = await db.select({ id: units.id }).from(units).where(
            and(eq(units.id, unitId), eq(units.buildingId, buildingId), eq(units.tenantId, tenantId))
        )

        if (!unit) {
            return errorResponse('Unit not found', 404)
        }

        const [upserted] = await db
            .insert(unitPaymentConfig)
            .values({
                tenantId,
                unitId,
                monthlyAmount: data.monthlyAmount,
                billingDay: data.billingDay,
            })
            .onConflictDoUpdate({
                target: unitPaymentConfig.unitId,
                set: {
                    monthlyAmount: data.monthlyAmount,
                    billingDay: data.billingDay,
                },
            })
            .returning()

        return successResponse(upserted)
    } catch (e) {
        console.error('Payment Config PATCH error', e)
        return await errorResponse('Internal server error', 500, e, req)
    }
}
