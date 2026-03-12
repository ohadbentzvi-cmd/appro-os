import { NextResponse, NextRequest } from 'next/server';
import { db } from '@apro/db';
import { units, buildings, unitPaymentConfig } from '@apro/db/src/schema';
import { eq, and, isNull } from 'drizzle-orm';
import { getServerUser } from '@/lib/supabase/server';

export async function GET(req: NextRequest) {
    try {
        const { tenantId: tenant_id } = await getServerUser()

        if (!tenant_id) {
            return NextResponse.json({ data: null, error: { message: 'Unauthorized' }, meta: null }, { status: 401 });
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
            .leftJoin(unitPaymentConfig, eq(units.id, unitPaymentConfig.unitId))
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
