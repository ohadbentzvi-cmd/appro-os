import { NextRequest, NextResponse } from 'next/server';
import { db } from '@apro/db';
import { payments, charges, people } from '@apro/db/src/schema';
import { eq, and, inArray } from 'drizzle-orm';
import { z } from 'zod';
import { getServerUser } from '@/lib/supabase/server';

const bulkPaySchema = z.object({
    chargeIds: z.array(z.string().uuid()).min(1).max(100),
    payment_method: z.enum(['bank_transfer', 'cash', 'credit_card', 'portal']).default('bank_transfer'),
    paid_at: z.string().datetime().optional(),
});

export async function POST(req: NextRequest) {
    try {
        const { user: authUser, tenantId } = await getServerUser();
        if (!tenantId) {
            return NextResponse.json({ data: null, error: { message: 'Unauthorized' }, meta: null }, { status: 401 });
        }

        const body = await req.json();
        const parsed = bulkPaySchema.safeParse(body);
        if (!parsed.success) {
            return NextResponse.json(
                { data: null, error: { message: 'Validation failed', details: parsed.error.issues }, meta: null },
                { status: 400 }
            );
        }

        const { chargeIds, payment_method, paid_at } = parsed.data;
        const paidAtDate = paid_at ? new Date(paid_at) : new Date();

        // Resolve recordedBy
        let recordedBy: string | null = null;
        if (authUser) {
            const [person] = await db
                .select({ id: people.id })
                .from(people)
                .where(eq(people.supabaseUserId, authUser.id));
            if (person) recordedBy = person.id;
        }

        // Fetch all requested charges, scoped to tenant
        const chargeRows = await db
            .select({
                id: charges.id,
                amountDue: charges.amountDue,
                status: charges.status,
            })
            .from(charges)
            .where(and(inArray(charges.id, chargeIds), eq(charges.tenantId, tenantId)));

        const results: { chargeId: string; status: 'ok' | 'skipped'; reason?: string }[] = [];

        for (const charge of chargeRows) {
            if (charge.status === 'paid' || charge.status === 'waived') {
                results.push({ chargeId: charge.id, status: 'skipped', reason: 'already_settled' });
                continue;
            }

            await db.insert(payments).values({
                tenantId,
                chargeId: charge.id,
                amount: charge.amountDue,
                paymentMethod: payment_method,
                paidAt: paidAtDate,
                recordedBy,
                notes: null,
            });

            results.push({ chargeId: charge.id, status: 'ok' });
        }

        // Report any chargeIds not found in DB (wrong tenant or non-existent)
        const foundIds = new Set(chargeRows.map(c => c.id));
        for (const id of chargeIds) {
            if (!foundIds.has(id)) {
                results.push({ chargeId: id, status: 'skipped', reason: 'not_found' });
            }
        }

        return NextResponse.json({ data: results, error: null, meta: null }, { status: 200 });
    } catch (error: any) {
        console.error('Bulk pay error:', error);
        return NextResponse.json(
            { data: null, error: { message: error.message || 'Internal server error' }, meta: null },
            { status: 500 }
        );
    }
}
