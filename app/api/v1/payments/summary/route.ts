import { NextResponse } from 'next/server';
import { db } from '@apro/db';
import { charges, units } from '@apro/db/src/schema';
import { eq, and, inArray } from 'drizzle-orm';

export async function GET(req: Request) {
    try {
        const tenant_id = process.env.APRO_TENANT_ID;

        if (!tenant_id) {
            console.error('APRO_TENANT_ID is missing from environment variables');
            return NextResponse.json(
                { data: null, error: { message: 'Internal server error' }, meta: null },
                { status: 500 }
            );
        }

        // Parse query params
        const url = new URL(req.url);
        const periodParam = url.searchParams.get('period_month');
        const buildingId = url.searchParams.get('building_id');

        // Current month or requested month
        const now = new Date();
        const currentMonth = periodParam || `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;

        // Build where conditions
        const conditions = [
            eq(charges.tenantId, tenant_id),
            eq(charges.periodMonth, currentMonth)
        ];

        if (buildingId && buildingId !== 'all') {
            const buildingUnitsQuery = db.select({ id: units.id })
                .from(units)
                .where(and(eq(units.buildingId, buildingId), eq(units.tenantId, tenant_id)));

            conditions.push(inArray(charges.unitId, buildingUnitsQuery));
        }

        // Fetch all charges for the tenant for the current month
        const monthlyCharges = await db.select()
            .from(charges)
            .where(and(...conditions));

        let total_collected = 0;
        let total_outstanding = 0;
        let overdue_unit_count = 0;

        const today = now.toISOString().split('T')[0];

        for (const charge of monthlyCharges) {
            total_collected += charge.amountPaid;

            if (charge.status === 'pending' || charge.status === 'partial') {
                total_outstanding += (charge.amountDue - charge.amountPaid);

                if (charge.dueDate < today) {
                    overdue_unit_count++;
                }
            }
        }

        let collection_rate = 0;
        if (total_collected + total_outstanding > 0) {
            collection_rate = (total_collected / (total_collected + total_outstanding)) * 100;
        }

        // Round collection rate to 1 decimal
        collection_rate = Math.round(collection_rate * 10) / 10;

        return NextResponse.json({
            data: {
                period_month: currentMonth,
                total_collected,
                total_outstanding,
                collection_rate,
                overdue_unit_count
            },
            error: null,
            meta: null
        });

    } catch (error: any) {
        console.error('Error fetching payments summary:', error);
        return NextResponse.json(
            { data: null, error: { message: error.message || 'Internal server error' }, meta: null },
            { status: 500 }
        );
    }
}
