import { NextRequest } from 'next/server'
import { db, unitPaymentConfig, units } from '@apro/db'
import { eq, and, isNull, desc, sql } from 'drizzle-orm'
import { successResponse, errorResponse } from '@/lib/api/response'
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

        const [unit] = await db.select({ id: units.id }).from(units).where(
            and(eq(units.id, unitId), eq(units.buildingId, buildingId))
        )

        if (!unit) {
            return errorResponse('Unit not found', 404)
        }

        const [config] = await db.select()
            .from(unitPaymentConfig)
            .where(
                and(
                    eq(unitPaymentConfig.unitId, unitId),
                    isNull(unitPaymentConfig.effectiveUntil)
                )
            )
            .orderBy(desc(unitPaymentConfig.createdAt))
            .limit(1)

        return successResponse(config || null)
    } catch (e) {
        console.error('Payment Config GET error', e)
        return await errorResponse('Internal server error', 500)
    }
}

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

        const valid = await validateBody(req, paymentConfigSchema)
        if ('error' in valid) return valid.error

        const data = valid.data
        const tenantId = process.env.APRO_TENANT_ID

        Sentry.addBreadcrumb({ category: 'finance', message: `Setting config for unit ${unitId}`, level: 'info' });
        if (!tenantId) {
            console.error('APRO_TENANT_ID is not configured')
            return await errorResponse('Internal server error', 500)
        }

        const [unit] = await db.select({ id: units.id }).from(units).where(
            and(eq(units.id, unitId), eq(units.buildingId, buildingId))
        )

        if (!unit) {
            return errorResponse('Unit not found', 404)
        }

        let newConfig;

        await db.transaction(async (tx) => {
            // Close the current active config if it exists
            await tx.update(unitPaymentConfig)
                .set({
                    // effectiveUntil = effectiveFrom - 1 day
                    effectiveUntil: sql`${data.effectiveFrom}::date - interval '1 day'`
                })
                .where(
                    and(
                        eq(unitPaymentConfig.unitId, unitId),
                        isNull(unitPaymentConfig.effectiveUntil)
                    )
                );

            // Insert new config row
            const [insertedConfig] = await tx.insert(unitPaymentConfig)
                .values({
                    tenantId,
                    unitId,
                    monthlyAmount: data.monthlyAmount,
                    effectiveFrom: data.effectiveFrom,
                })
                .returning();

            newConfig = insertedConfig;
        });

        return successResponse(newConfig)
    } catch (e) {
        console.error('Payment Config POST error', e)
        return await errorResponse('Internal server error', 500)
    }
}
