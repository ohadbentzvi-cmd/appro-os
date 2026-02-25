import { NextResponse, NextRequest } from 'next/server';
import { db } from '@apro/db';
import { units, buildings, unitPaymentConfig, unitRoles } from '@apro/db/src/schema';
import { eq, and, isNull } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
    try {
        const tenant_id = process.env.APRO_TENANT_ID;
        if (!tenant_id) {
            return NextResponse.json({ data: null, error: { message: 'Internal server error' }, meta: null }, { status: 500 });
        }

        // Fetch all necessary data for the tenant
        const allUnitsRes = await db
            .select({
                id: units.id,
                unitNumber: units.unitNumber,
                buildingId: buildings.id,
                buildingAddress: buildings.addressStreet,
            })
            .from(units)
            .innerJoin(buildings, eq(units.buildingId, buildings.id))
            .where(eq(units.tenantId, tenant_id));

        const allActiveConfigs = await db
            .select()
            .from(unitPaymentConfig)
            .where(and(eq(unitPaymentConfig.tenantId, tenant_id), isNull(unitPaymentConfig.effectiveUntil)));

        const allActiveRoles = await db
            .select()
            .from(unitRoles)
            .where(and(eq(unitRoles.tenantId, tenant_id), isNull(unitRoles.effectiveTo)));

        const missingPaymentConfigCount: any[] = [];
        const missingOccupantCount: any[] = [];
        const missingFeePayerCount: any[] = [];

        for (const unit of allUnitsRes) {
            const unitConfigs = allActiveConfigs.filter(c => c.unitId === unit.id);
            if (unitConfigs.length === 0) {
                missingPaymentConfigCount.push({
                    unit_id: unit.id,
                    unit_identifier: unit.unitNumber,
                    building_id: unit.buildingId,
                    building_address: unit.buildingAddress,
                    fix_url: `/dashboard/buildings/${unit.buildingId}/units/${unit.id}`
                });
            }

            const unitRolesForUnit = allActiveRoles.filter(r => r.unitId === unit.id);

            // missing_occupant: no active owner or tenant
            const hasOwnerOrTenant = unitRolesForUnit.some(r => r.roleType === 'owner' || r.roleType === 'tenant');
            if (!hasOwnerOrTenant) {
                missingOccupantCount.push({
                    unit_id: unit.id,
                    unit_identifier: unit.unitNumber,
                    building_id: unit.buildingId,
                    building_address: unit.buildingAddress,
                    fix_url: `/dashboard/buildings/${unit.buildingId}/units/${unit.id}`
                });
            }

            // missing_fee_payer: has at least one active role, but none are fee_payer
            if (unitRolesForUnit.length > 0) {
                const hasFeePayer = unitRolesForUnit.some(r => r.isFeePayer);
                if (!hasFeePayer) {
                    missingFeePayerCount.push({
                        unit_id: unit.id,
                        unit_identifier: unit.unitNumber,
                        building_id: unit.buildingId,
                        building_address: unit.buildingAddress,
                        fix_url: `/dashboard/buildings/${unit.buildingId}/units/${unit.id}`
                    });
                }
            }
        }

        const warnings: any[] = [];
        let total = 0;

        if (missingPaymentConfigCount.length > 0) {
            warnings.push({
                type: 'missing_payment_config',
                severity: 'high',
                count: missingPaymentConfigCount.length,
                items: missingPaymentConfigCount
            });
            total++;
        }

        if (missingOccupantCount.length > 0) {
            warnings.push({
                type: 'missing_occupant',
                severity: 'medium',
                count: missingOccupantCount.length,
                items: missingOccupantCount
            });
            total++;
        }

        if (missingFeePayerCount.length > 0) {
            warnings.push({
                type: 'missing_fee_payer',
                severity: 'medium',
                count: missingFeePayerCount.length,
                items: missingFeePayerCount
            });
            total++;
        }

        return NextResponse.json({
            data: {
                total,
                warnings
            },
            error: null,
            meta: {
                computed_at: new Date().toISOString()
            }
        });

    } catch (error: any) {
        console.error('Error computing warnings:', error);
        return NextResponse.json({ data: null, error: { message: error.message || 'Internal server error' }, meta: null }, { status: 500 });
    }
}
