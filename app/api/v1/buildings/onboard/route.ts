import { NextRequest } from 'next/server';
import { db, buildings, units, people, unitRoles, unitPaymentConfig } from '@apro/db';
import { eq, and, inArray } from 'drizzle-orm';
import * as Sentry from '@sentry/nextjs';
import { successResponse, errorResponse } from '@/lib/api/response';
import { getServerUser } from '@/lib/supabase/server';
import { captureApiError } from '@/lib/api/sentry';
import { validateBody } from '@/lib/api/validate';
import { buildingOnboardSchema } from '@/lib/api/schemas/buildingOnboard';

export type PhoneConflict = {
    phone: string;
    existing_id: string;
    existing_name: string;
    entered_name: string;
};

export async function POST(req: NextRequest) {
    try {
        const valid = await validateBody(req, buildingOnboardSchema);
        if ('error' in valid) return valid.error;

        const data = valid.data;
        const { tenantId } = await getServerUser();

        if (!tenantId) {
            return await errorResponse('Unauthorized', 401);
        }

        Sentry.addBreadcrumb({
            category: 'finance',
            message: `Building onboarding started for tenant ${tenantId}`,
            level: 'info',
        });

        // --- Phase 1: Phone conflict pre-check ---
        // Collect all phones that do not already have an existing_id resolved by the client
        type PhoneEntry = { phone: string; full_name: string };
        const phonesToCheck: PhoneEntry[] = [];

        for (const unit of data.units) {
            for (const person of [unit.owner, unit.tenant]) {
                if (person && person.phone && !person.existing_id) {
                    phonesToCheck.push({ phone: person.phone, full_name: person.full_name });
                }
            }
        }

        if (phonesToCheck.length > 0) {
            const uniquePhones = [...new Set(phonesToCheck.map(p => p.phone))];
            const existingPeople = await db
                .select({ id: people.id, phone: people.phone, fullName: people.fullName })
                .from(people)
                .where(and(eq(people.tenantId, tenantId), inArray(people.phone, uniquePhones)));

            const conflicts: PhoneConflict[] = [];
            for (const existing of existingPeople) {
                const submitted = phonesToCheck.find(p => p.phone === existing.phone);
                if (!submitted) continue;

                const normalizedExisting = existing.fullName.trim().toLowerCase();
                const normalizedEntered = submitted.full_name.trim().toLowerCase();

                if (normalizedExisting !== normalizedEntered) {
                    conflicts.push({
                        phone: existing.phone!,
                        existing_id: existing.id,
                        existing_name: existing.fullName,
                        entered_name: submitted.full_name,
                    });
                }
                // Same name match: silently set existing_id in-memory so the transaction reuses it
                // (handled below in processRole via existing_id lookup)
            }

            if (conflicts.length > 0) {
                return Response.json(
                    { error: 'PHONE_CONFLICT', conflicts },
                    { status: 409 }
                );
            }

            // For same-name matches: inject existing_id so processRole reuses them
            for (const unit of data.units) {
                for (const person of [unit.owner, unit.tenant]) {
                    if (person && person.phone && !person.existing_id) {
                        const match = existingPeople.find(
                            e => e.phone === person.phone &&
                                e.fullName.trim().toLowerCase() === person.full_name.trim().toLowerCase()
                        );
                        if (match) {
                            person.existing_id = match.id;
                        }
                    }
                }
            }
        }

        // --- Phase 2: Main transaction ---
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
                            .where(and(eq(people.id, personId), eq(people.tenantId, tenantId)))
                            .limit(1);

                        if (existingPerson.length === 0) {
                            throw new Error(`Person with id ${personId} not found or belongs to another tenant`);
                        }
                    } else {
                        // Insert new person — whatsappName pre-filled with first name
                        const firstName = personData.full_name.split(' ')[0] || personData.full_name;
                        const [newPerson] = await tx
                            .insert(people)
                            .values({
                                tenantId,
                                fullName: personData.full_name,
                                phone: personData.phone,
                                whatsappName: firstName,
                            })
                            .returning({ id: people.id });
                        personId = newPerson.id;
                    }

                    await tx.insert(unitRoles).values({
                        tenantId,
                        unitId,
                        personId,
                        roleType,
                        effectiveFrom: today,
                        effectiveTo: null,
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
                        effectiveUntil: null,
                        createdBy: null,
                    });
                }
            }

            return buildingId;
        });

        return successResponse({ building_id: result });
    } catch (e: any) {
        console.error('POST /buildings/onboard error:', e);
        Sentry.withScope((scope) => {
            scope.setTag('operation', 'building_onboard');
            captureApiError(e, req).catch(() => { });
        });

        return await errorResponse('ONBOARD_FAILED', 500, {
            message: 'Failed to onboard building',
        });
    }
}
