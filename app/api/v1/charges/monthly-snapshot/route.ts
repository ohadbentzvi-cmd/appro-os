import { NextResponse } from 'next/server';
import { db } from '@apro/db';
import { charges, units, buildings, unitPaymentConfig, unitRoles, people } from '@apro/db/src/schema';
import { eq, and, asc, isNull } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
    try {
        const tenant_id = process.env.APRO_TENANT_ID;
        if (!tenant_id) {
            return NextResponse.json(
                { data: null, error: { message: 'Internal server error' }, meta: null },
                { status: 500 }
            );
        }

        const url = new URL(req.url);
        const periodMonth = url.searchParams.get('period_month');

        if (!periodMonth) {
            return NextResponse.json(
                { data: null, error: { message: 'period_month is required' }, meta: null },
                { status: 400 }
            );
        }

        // 1. Fetch all buildings for tenant
        const allBuildings = await db.select({
            id: buildings.id,
            address: buildings.addressStreet
        })
            .from(buildings)
            .where(eq(buildings.tenantId, tenant_id))
            .orderBy(asc(buildings.addressStreet));

        // 2. Fetch all units for tenant with their config status
        const allUnits = await db.select({
            id: units.id,
            buildingId: units.buildingId,
            unitNumber: units.unitNumber,
            floor: units.floor,
            hasConfig: unitPaymentConfig.id
        })
            .from(units)
            .leftJoin(unitPaymentConfig, eq(units.id, unitPaymentConfig.unitId))
            .where(eq(units.tenantId, tenant_id))
            .orderBy(asc(units.floor), asc(units.unitNumber));

        // 3. Fetch all charges for the month
        const allCharges = await db.select()
            .from(charges)
            .where(
                and(
                    eq(charges.tenantId, tenant_id),
                    eq(charges.periodMonth, periodMonth)
                )
            );

        // Map charges by unitId for O(1) lookup
        const chargesByUnit = new Map();
        for (const charge of allCharges) {
            chargesByUnit.set(charge.unitId, charge);
        }

        // 4. Fetch fee payers (isFeePayer = true and effectiveTo is null) for the tenant
        const activeFeePayers = await db.select({
            unitId: unitRoles.unitId,
            roleType: unitRoles.roleType,
            fullName: people.fullName
        })
            .from(unitRoles)
            .innerJoin(people, eq(unitRoles.personId, people.id))
            .where(
                and(
                    eq(unitRoles.tenantId, tenant_id),
                    eq(unitRoles.isFeePayer, true),
                    isNull(unitRoles.effectiveTo)
                )
            );

        const feePayersByUnit = new Map();
        for (const fp of activeFeePayers) {
            feePayersByUnit.set(fp.unitId, fp);
        }

        let totalUnits = 0;
        let totalCharges = 0;
        let unconfiguredUnits = 0;

        // Group units by building ID
        const unitsByBuilding = new Map();
        for (const u of allUnits) {
            if (!unitsByBuilding.has(u.buildingId)) {
                unitsByBuilding.set(u.buildingId, []);
            }

            totalUnits++;

            const charge = chargesByUnit.get(u.id);

            if (!u.hasConfig) {
                unconfiguredUnits++;
            }

            if (charge) {
                totalCharges++;
            }

            const feePayer = feePayersByUnit.get(u.id);
            let translatedRole = null;
            if (feePayer?.roleType) {
                const translations: Record<string, string> = {
                    owner: 'בעל דירה',
                    tenant: 'שוכר',
                    guarantor: 'ערב'
                };
                translatedRole = translations[feePayer.roleType] || feePayer.roleType;
            }

            // Using today date without time for overdue comparison
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            const is_overdue = !!(charge?.status === 'pending' || charge?.status === 'partial') &&
                !!(charge?.dueDate && new Date(charge.dueDate) < today);

            unitsByBuilding.get(u.buildingId).push({
                unit_id: u.id,
                unit_identifier: u.unitNumber,
                floor: u.floor,
                charge_id: charge?.id || null,
                amount_due: charge?.amountDue || 0,
                amount_paid: charge?.amountPaid || 0,
                status: charge?.status || 'no_config',
                due_date: charge?.dueDate || null,
                is_overdue: is_overdue,
                fee_payer_name: feePayer?.fullName || null,
                fee_payer_role: translatedRole
            });
        }

        // Construct final nested array
        const buildingsResp = allBuildings.map(b => ({
            building_id: b.id,
            building_address: b.address,
            units: unitsByBuilding.get(b.id) || []
        }));

        return NextResponse.json({
            data: {
                period_month: periodMonth,
                buildings: buildingsResp
            },
            error: null,
            meta: {
                total_units: totalUnits,
                total_charges: totalCharges,
                unconfigured_units: unconfiguredUnits
            }
        });

    } catch (error: any) {
        console.error('Error fetching monthly snapshot:', error);
        return NextResponse.json(
            { data: null, error: { message: error.message || 'Internal server error' }, meta: null },
            { status: 500 }
        );
    }
}
