import { NextResponse, NextRequest } from 'next/server';
import { db } from '@apro/db';
import { payments, charges } from '@apro/db/src/schema';
import { eq, and } from 'drizzle-orm';
import { z } from 'zod';

const paymentSchema = z.object({
    amount: z.number().int().min(1),
    payment_method: z.enum(['cash', 'bank_transfer', 'credit_card', 'portal']),
    paid_at: z.string().refine((val) => !isNaN(Date.parse(val)), { message: "Invalid date" }),
    notes: z.string().max(500).optional().nullable()
});

export async function PUT(
    req: NextRequest,
    { params }: { params: Promise<{ id: string, paymentId: string }> }
) {
    try {
        const tenant_id = process.env.APRO_TENANT_ID;
        if (!tenant_id) {
            return NextResponse.json({ data: null, error: { message: 'Internal server error' }, meta: null }, { status: 500 });
        }

        const resolvedParams = await params;
        const chargeId = resolvedParams.id;
        const paymentId = resolvedParams.paymentId;

        const body = await req.json();
        const parsed = paymentSchema.safeParse(body);
        if (!parsed.success) {
            return NextResponse.json({ data: null, error: { message: 'Validation failed', details: parsed.error.issues }, meta: null }, { status: 400 });
        }

        const { amount, payment_method, paid_at, notes } = parsed.data;

        const paidAtDate = new Date(paid_at);
        if (paidAtDate > new Date()) {
            return NextResponse.json({ data: null, error: { message: 'Payment date cannot be in the future' }, meta: null }, { status: 400 });
        }

        // Verify charge
        const [charge] = await db.select().from(charges).where(and(eq(charges.id, chargeId), eq(charges.tenantId, tenant_id)));
        if (!charge) {
            return NextResponse.json({ data: null, error: { message: 'Charge not found' }, meta: null }, { status: 404 });
        }

        // Verify payment exists
        const [payment] = await db.select().from(payments).where(and(eq(payments.id, paymentId), eq(payments.tenantId, tenant_id)));
        if (!payment) {
            return NextResponse.json({ data: null, error: { message: 'Payment not found' }, meta: null }, { status: 404 });
        }

        // Update payment
        const [updatedPayment] = await db.update(payments)
            .set({
                amount,
                paymentMethod: payment_method,
                paidAt: paidAtDate,
                notes: notes || null
            })
            .where(eq(payments.id, paymentId))
            .returning();

        return NextResponse.json({
            data: {
                id: updatedPayment.id,
                amount: updatedPayment.amount,
                payment_method: updatedPayment.paymentMethod,
                paid_at: updatedPayment.paidAt,
                notes: updatedPayment.notes
            },
            error: null,
            meta: null
        }, { status: 200 });

    } catch (error: any) {
        console.error('Error updating payment:', error);
        return NextResponse.json({ data: null, error: { message: error.message || 'Internal server error' }, meta: null }, { status: 500 });
    }
}
