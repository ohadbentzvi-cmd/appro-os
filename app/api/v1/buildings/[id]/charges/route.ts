import { NextResponse } from 'next/server';
import { db } from '@apro/db';
import { units, charges } from '@apro/db/src/schema';
import { eq, and, sql } from 'drizzle-orm';

export async function GET(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const tenant_id = process.env.APRO_TENANT_ID;
        const resolvedParams = await params;
        const buildingId = resolvedParams.id;

        if (!tenant_id) {
            return NextResponse.json(
                { data: null, error: { message: 'Internal server error' }, meta: null },
                { status: 500 }
            );
        }

        const now = new Date();
        const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;

        // Fetch all units for this building, left joined with charges for the current month
        const results = await db.select({
            unitId: units.id,
            unitNumber: units.unitNumber,
            floor: units.floor,
            chargeId: charges.id,
            amountDue: charges.amountDue,
            amountPaid: charges.amountPaid,
            status: charges.status,
            dueDate: charges.dueDate,
            periodMonth: charges.periodMonth
        })
            .from(units)
            .leftJoin(
                charges,
                and(
                    eq(charges.unitId, units.id),
                    eq(charges.periodMonth, currentMonth),
                    eq(charges.tenantId, tenant_id)
                )
            )
            .where(
                and(
                    eq(units.buildingId, buildingId),
                    eq(units.tenantId, tenant_id)
                )
            )
            .orderBy(units.floor, units.unitNumber);

        // Map the results to the response shape
        const data = results.map(row => {
            if (row.chargeId) {
                return {
                    unit_id: row.unitId,
                    unit_identifier: row.unitNumber,
                    floor: row.floor,
                    charge_id: row.chargeId,
                    amount_due: row.amountDue,
                    amount_paid: row.amountPaid,
                    status: row.status,
                    due_date: row.dueDate,
                    period_month: row.periodMonth
                };
            } else {
                // Return no_config state
                return {
                    unit_id: row.unitId,
                    unit_identifier: row.unitNumber,
                    floor: row.floor,
                    charge_id: null,
                    amount_due: 0,
                    amount_paid: 0,
                    status: 'no_config',
                    due_date: null,
                    period_month: null
                };
            }
        });

        return NextResponse.json({
            data,
            error: null,
            meta: null
        });

    } catch (error: any) {
        console.error('Error fetching building charges:', error);
        return NextResponse.json(
            { data: null, error: { message: error.message || 'Internal server error' }, meta: null },
            { status: 500 }
        );
    }
}
