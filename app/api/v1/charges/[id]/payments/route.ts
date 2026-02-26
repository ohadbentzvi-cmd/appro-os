import { NextResponse, NextRequest } from 'next/server';
import { db } from '@apro/db';
import { payments, charges, people } from '@apro/db/src/schema';
import { eq, and, desc } from 'drizzle-orm';
import { z } from 'zod';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import * as Sentry from '@sentry/nextjs';
import { captureApiError } from '@/lib/api/sentry';

const paymentSchema = z.object({
    amount: z.number().int().min(1),
    payment_method: z.enum(['cash', 'bank_transfer', 'credit_card', 'portal']),
    paid_at: z.string().refine((val) => !isNaN(Date.parse(val)), { message: "Invalid date" }),
    notes: z.string().max(500).optional().nullable()
});

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
        await captureApiError(error);
        return NextResponse.json(
            { data: null, error: { message: error.message || 'Internal server error' }, meta: null },
            { status: 500 }
        );
    }
}

export async function POST(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const tenant_id = process.env.APRO_TENANT_ID;
        if (!tenant_id) {
            return NextResponse.json({ data: null, error: { message: 'Internal server error' }, meta: null }, { status: 500 });
        }

        const resolvedParams = await params;
        const chargeId = resolvedParams.id;

        const body = await req.json();
        const parsed = paymentSchema.safeParse(body);
        if (!parsed.success) {
            return NextResponse.json({ data: null, error: { message: 'Validation failed', details: parsed.error.issues }, meta: null }, { status: 400 });
        }

        const { amount, payment_method, paid_at, notes } = parsed.data;

        Sentry.addBreadcrumb({ category: 'finance', message: `Adding payment of ${amount} to charge ${chargeId}`, level: 'info' });

        // Ensure paid_at is not in the future
        const paidAtDate = new Date(paid_at);
        if (paidAtDate > new Date()) {
            return NextResponse.json({ data: null, error: { message: 'Payment date cannot be in the future' }, meta: null }, { status: 400 });
        }

        // Get charge
        const [charge] = await db.select().from(charges).where(and(eq(charges.id, chargeId), eq(charges.tenantId, tenant_id)));
        if (!charge) {
            return NextResponse.json({ data: null, error: { message: 'Charge not found' }, meta: null }, { status: 404 });
        }

        if (charge.status === 'paid' || charge.status === 'waived') {
            return NextResponse.json({ data: null, error: { message: 'Charge is already paid or waived' }, meta: null }, { status: 409 });
        }

        if (amount > charge.amountDue) {
            return NextResponse.json({ data: null, error: "amount_exceeds_due", meta: null }, { status: 422 });
        }

        // Get authenticated user
        let recordedBy: string | null = null;
        try {
            const supabase = await createSupabaseServerClient();
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                const [person] = await db.select({ id: people.id }).from(people).where(eq(people.supabaseUserId, user.id));
                if (person) {
                    recordedBy = person.id;
                }
            }
        } catch (e) {
            console.error('Error extracting user session:', e);
            // Non-fatal, recordedBy will be null
        }

        // Insert payment
        const [newPayment] = await db.insert(payments).values({
            tenantId: tenant_id,
            chargeId: chargeId,
            amount,
            paymentMethod: payment_method,
            paidAt: paidAtDate,
            recordedBy,
            notes: notes || null
        }).returning();

        return NextResponse.json({
            data: {
                id: newPayment.id,
                amount: newPayment.amount,
                payment_method: newPayment.paymentMethod,
                paid_at: newPayment.paidAt,
                notes: newPayment.notes
            },
            error: null,
            meta: null
        }, { status: 201 });

    } catch (error: any) {
        console.error('Error creating payment:', error);
        await captureApiError(error);
        return NextResponse.json({ data: null, error: { message: error.message || 'Internal server error' }, meta: null }, { status: 500 });
    }
}
