import { NextResponse } from 'next/server';
import { db } from '@apro/db';
import { charges, units, buildings } from '@apro/db/src/schema';
import { eq, and, desc, lt, gte, inArray, or, sql } from 'drizzle-orm';

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
        const buildingId = url.searchParams.get('building_id');
        const statusParam = url.searchParams.get('status');
        const cursor = url.searchParams.get('cursor'); // uuid charge id
        const limit = 25;

        if (!periodMonth) {
            return NextResponse.json(
                { data: null, error: { message: 'period_month is required' }, meta: null },
                { status: 400 }
            );
        }

        const now = new Date();
        const todayStr = now.toISOString().split('T')[0];

        // Base conditions
        const conditions = [
            eq(charges.tenantId, tenant_id),
            eq(charges.periodMonth, periodMonth)
        ];

        // Status filter
        if (statusParam && statusParam !== 'all') {
            if (statusParam === 'overdue') {
                conditions.push(
                    inArray(charges.status, ['pending', 'partial']),
                    lt(charges.dueDate, todayStr)
                );
            } else {
                conditions.push(eq(charges.status, statusParam as 'pending' | 'paid' | 'partial' | 'waived'));
            }
        }

        // Building filter
        if (buildingId && buildingId !== 'all') {
            const buildingUnitsQuery = db.select({ id: units.id })
                .from(units)
                .where(and(eq(units.buildingId, buildingId), eq(units.tenantId, tenant_id)));

            conditions.push(inArray(charges.unitId, buildingUnitsQuery));
        }

        // Get the cursor reference row if cursor exists
        let cursorRow = null;
        if (cursor) {
            const cursorResults = await db.select({
                createdAt: charges.createdAt,
                id: charges.id
            })
                .from(charges)
                .where(and(eq(charges.id, cursor), eq(charges.tenantId, tenant_id)))
                .limit(1);

            if (cursorResults.length > 0) {
                cursorRow = cursorResults[0];
            }
        }

        // Apply cursor condition (ordering by createdAt DESC, then id DESC)
        if (cursorRow) {
            const exactMatch = and(
                eq(charges.createdAt, cursorRow.createdAt),
                lt(charges.id, cursorRow.id)
            );

            if (exactMatch) {
                conditions.push(
                    or(
                        lt(charges.createdAt, cursorRow.createdAt),
                        exactMatch
                    )!
                );
            } else {
                conditions.push(lt(charges.createdAt, cursorRow.createdAt));
            }
        }

        // Execute query combining charges, units, and buildings
        const results = await db.select({
            charge_id: charges.id,
            unit_id: units.id,
            unit_identifier: units.unitNumber,
            floor: units.floor,
            building_id: buildings.id,
            building_address: buildings.addressStreet,
            period_month: charges.periodMonth,
            amount_due: charges.amountDue,
            amount_paid: charges.amountPaid,
            status: charges.status,
            due_date: charges.dueDate,
            createdAt: charges.createdAt
        })
            .from(charges)
            .innerJoin(units, eq(charges.unitId, units.id))
            .innerJoin(buildings, eq(units.buildingId, buildings.id))
            .where(and(...(conditions as any[])))
            .orderBy(
                desc(buildings.id), // Group by building logic
                desc(charges.createdAt),
                desc(charges.id)
            )
            .limit(limit + 1); // fetch 1 extra to check for next page

        const hasNextPage = results.length > limit;
        const data = results.slice(0, limit);
        const nextCursor = hasNextPage ? data[data.length - 1].charge_id : null;

        // Clean up the response to exclude createdAt which was used for pagination
        const cleanedData = data.map(({ createdAt, ...rest }) => rest);

        return NextResponse.json({
            data: cleanedData,
            error: null,
            meta: {
                next_cursor: nextCursor,
                has_more: hasNextPage
            }
        });

    } catch (error: any) {
        console.error('Error fetching charges:', error);
        return NextResponse.json(
            { data: null, error: { message: error.message || 'Internal server error' }, meta: null },
            { status: 500 }
        );
    }
}
