import { NextResponse } from 'next/server';
import { db } from '@apro/db';
import { units, unitPaymentConfig, buildings } from '@apro/db/src/schema';
import { eq, and, isNull } from 'drizzle-orm';

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
        const buildingId = url.searchParams.get('building_id');

        const conditions = [
            eq(units.tenantId, tenant_id),
            isNull(unitPaymentConfig.id)
        ];

        if (buildingId && buildingId !== 'all') {
            conditions.push(eq(units.buildingId, buildingId));
        }

        const unconfiguredUnits = await db.select({
            id: units.id,
            unitNumber: units.unitNumber,
            floor: units.floor,
            buildingAddress: buildings.addressStreet
        })
            .from(units)
            .leftJoin(unitPaymentConfig, eq(units.id, unitPaymentConfig.unitId))
            .innerJoin(buildings, eq(units.buildingId, buildings.id))
            .where(and(...(conditions as any[])))
            .orderBy(buildings.id, units.floor, units.unitNumber);

        return NextResponse.json({
            data: unconfiguredUnits,
            error: null,
            meta: null
        });

    } catch (error: any) {
        console.error('Error fetching unconfigured units:', error);
        return NextResponse.json(
            { data: null, error: { message: error.message || 'Internal server error' }, meta: null },
            { status: 500 }
        );
    }
}
