import { NextResponse, NextRequest } from 'next/server';
import { db } from '@apro/db';
import { units, buildings, unitPaymentConfig } from '@apro/db/src/schema';
import { eq, and, isNull } from 'drizzle-orm';

export async function GET(req: NextRequest) {
    try {
        const tenant_id = process.env.APRO_TENANT_ID;
        if (!tenant_id) {
            return NextResponse.json({ data: null, error: { message: 'Internal server error' }, meta: null }, { status: 500 });
        }

        const results = await db
            .select({
                unit_id: units.id,
                unit_identifier: units.unitNumber,
                building_id: buildings.id,
                building_address: buildings.addressStreet,
                floor: units.floor
            })
            .from(units)
            .innerJoin(buildings, eq(units.buildingId, buildings.id))
            .leftJoin(unitPaymentConfig, and(
                eq(units.id, unitPaymentConfig.unitId),
                isNull(unitPaymentConfig.effectiveUntil)
            ))
            .where(
                and(
                    eq(units.tenantId, tenant_id),
                    isNull(unitPaymentConfig.id)
                )
            );

        return NextResponse.json({
            data: results,
            error: null,
            meta: { total: results.length }
        });

    } catch (error: any) {
        console.error('Error fetching unconfigured units:', error);
        return NextResponse.json({ data: null, error: { message: error.message || 'Internal server error' }, meta: null }, { status: 500 });
    }
}
