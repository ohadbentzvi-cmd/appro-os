import { NextRequest } from 'next/server';
import { db, buildings, units, people, unitRoles, unitPaymentConfig } from '@apro/db';
import { eq, and } from 'drizzle-orm';
import * as Sentry from '@sentry/nextjs';
import { successResponse, errorResponse } from '@/lib/api/response';
import { captureApiError } from '@/lib/api/sentry';
import { validateBody } from '@/lib/api/validate';
import { buildingOnboardSchema } from '@/lib/api/schemas/buildingOnboard';

export async function POST(req: NextRequest) {
    try {
        const valid = await validateBody(req, buildingOnboardSchema);
        if ('error' in valid) return valid.error;

        const data = valid.data;
        const tenantId = process.env.APRO_TENANT_ID;
        if (!tenantId) {
            console.error('APRO_TENANT_ID is not configured');
            return await errorResponse('Internal server error', 500);
        }

        Sentry.addBreadcrumb({
            category: 'finance',
            message: `Building onboarding started for tenant ${tenantId}`,
            level: 'info'
        });

        // Run everything in a single transaction
        const result = await db.transaction(async (tx) => {
            // 1. Insert Building
            const [newBuilding] = await tx
                .insert(buildings)
                .values({
                    tenantId,
                    name: data.building.name,
                    addressStreet: `${data.building.street} ${data.building.street_number}`,
                    addressCity: data.building.city,
                    numFloors: data.building.floors ?? 1,
                    numUnits: data.units.length,
                    builtYear: data.building.year_built,
                })
                .returning({ id: buildings.id });

            const buildingId = newBuilding.id;
            const today = new Date().toISOString().split('T')[0];

            // 2. Iterate and Insert Units
            for (const unit of data.units) {
                const [newUnit] = await tx
                    .insert(units)
                    .values({
                        tenantId,
                        buildingId,
                        unitNumber: unit.unit_number,
                        floor: unit.floor ?? 0,
                    })
                    .returning({ id: units.id });

                const unitId = newUnit.id;

                // Helper to process roles
                const processRole = async (
                    personData: typeof unit.owner | typeof unit.tenant,
                    roleType: 'owner' | 'tenant'
                ) => {
                    if (!personData) return;

                    let personId = personData.existing_id;

                    if (personId) {
                        // Verify existing person belongs to this tenant
                        const existingPerson = await tx
                            .select({ id: people.id })
                            .from(people)
                            .where(
                                and(
                                    eq(people.id, personId),
                                    eq(people.tenantId, tenantId)
                                )
                            )
                            .limit(1);

                        if (existingPerson.length === 0) {
                            throw new Error(`Person with id ${personId} not found or belongs to another tenant`);
                        }
                    } else {
                        // Insert new person
                        const [newPerson] = await tx
                            .insert(people)
                            .values({
                                tenantId,
                                fullName: personData.full_name,
                                phone: personData.phone,
                            })
                            .returning({ id: people.id });
                        personId = newPerson.id;
                    }

                    // Insert unit role
                    await tx.insert(unitRoles).values({
                        tenantId,
                        unitId,
                        personId,
                        roleType,
                        effectiveFrom: today,
                        effectiveTo: null, // Currently active
                        isFeePayer: unit.fee_payer === roleType,
                    });
                };

                // 3. Process Owner and Tenant
                await processRole(unit.owner, 'owner');
                await processRole(unit.tenant, 'tenant');

                // 4. Process Payment Config
                if (unit.monthly_amount_agorot !== undefined) {
                    await tx.insert(unitPaymentConfig).values({
                        tenantId,
                        unitId,
                        monthlyAmount: unit.monthly_amount_agorot,
                        effectiveFrom: today,
                        effectiveUntil: null, // Currently active
                        createdBy: null,
                    });
                }
            }

            return buildingId;
        });

        return successResponse({ building_id: result });
    } catch (e: any) {
        console.error('POST /buildings/onboard error:', e);
        // Explicitly exclude PII from Sentry context
        Sentry.withScope((scope) => {
            scope.setTag('operation', 'building_onboard');
            scope.setExtra('tenant_id', process.env.APRO_TENANT_ID);
            // No full_name, phone, or wizard data is passed to Sentry
            captureApiError(e, req).catch(() => { });
        });

        // Explicitly return the specific error message expected by the spec
        return await errorResponse('ONBOARD_FAILED', 500, {
            message: 'Failed to onboard building', // Kept generic to avoid PII leaking
        });
    }
}
