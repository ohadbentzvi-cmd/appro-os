import { NextResponse } from 'next/server';
import { db } from '@apro/db';
import { payments } from '@apro/db/src/schema';
import { eq, and, desc } from 'drizzle-orm';

export async function GET(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const tenant_id = process.env.APRO_TENANT_ID;
        const resolvedParams = await params;
        const chargeId = resolvedParams.id;

        if (!tenant_id) {
            return NextResponse.json(
                { data: null, error: { message: 'Internal server error' }, meta: null },
                { status: 500 }
            );
        }

        // Fetch all payments for this charge
        const results = await db.select({
            id: payments.id,
            amount: payments.amount,
            paymentMethod: payments.paymentMethod,
            paidAt: payments.paidAt,
            notes: payments.notes
        })
            .from(payments)
            .where(
                and(
                    eq(payments.chargeId, chargeId),
                    eq(payments.tenantId, tenant_id)
                )
            )
            .orderBy(desc(payments.paidAt));

        // Map camelCase to snake_case for the API response
        const data = results.map(row => ({
            id: row.id,
            amount: row.amount,
            payment_method: row.paymentMethod,
            paid_at: row.paidAt,
            notes: row.notes
        }));

        return NextResponse.json({
            data,
            error: null,
            meta: null
        });

    } catch (error: any) {
        console.error('Error fetching charge payments:', error);
        return NextResponse.json(
            { data: null, error: { message: error.message || 'Internal server error' }, meta: null },
            { status: 500 }
        );
    }
}
