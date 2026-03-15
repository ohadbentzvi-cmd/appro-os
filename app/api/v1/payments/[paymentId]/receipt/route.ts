import { NextRequest, NextResponse } from 'next/server';
import { db } from '@apro/db';
import { payments, charges, units, buildings, unitRoles, people, paymentReceipts, receiptCounters } from '@apro/db/src/schema';
import { eq, and, isNull, lte, or, gte, sql } from 'drizzle-orm';
import { renderToBuffer } from '@react-pdf/renderer';
import React from 'react';
import { getServerUser } from '@/lib/supabase/server';
import { captureApiError } from '@/lib/api/sentry';
import ReceiptDocument from '@/app/components/pdf/ReceiptDocument';

export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ paymentId: string }> }
) {
    try {
        const { tenantId: tenant_id } = await getServerUser();
        if (!tenant_id) {
            return NextResponse.json(
                { data: null, error: { message: 'Unauthorized' }, meta: null },
                { status: 401 }
            );
        }

        const { paymentId } = await params;

        // 1. Fetch payment + charge + unit + building in one query
        const [row] = await db
            .select({
                paymentId:     payments.id,
                amount:        payments.amount,
                paymentMethod: payments.paymentMethod,
                paidAt:        payments.paidAt,
                periodMonth:   charges.periodMonth,
                unitId:        units.id,
                unitNumber:    units.unitNumber,
                buildingName:  buildings.name,
                addressStreet: buildings.addressStreet,
                addressCity:   buildings.addressCity,
            })
            .from(payments)
            .innerJoin(charges,   eq(charges.id,   payments.chargeId))
            .innerJoin(units,     eq(units.id,     charges.unitId))
            .innerJoin(buildings, eq(buildings.id, units.buildingId))
            .where(and(
                eq(payments.id,       paymentId),
                eq(payments.tenantId, tenant_id),
            ))
            .limit(1);

        if (!row) {
            return NextResponse.json(
                { data: null, error: { message: 'Payment not found' }, meta: null },
                { status: 404 }
            );
        }

        // 2. Check for an existing receipt (idempotent — reuse the same number)
        let receipt = await db
            .select()
            .from(paymentReceipts)
            .where(eq(paymentReceipts.paymentId, paymentId))
            .limit(1)
            .then(rows => rows[0] ?? null);

        if (!receipt) {
            // 3. Resolve fee payer at the time of the payment
            const paidAtDate = row.paidAt.toISOString().split('T')[0]; // YYYY-MM-DD

            const [feePayerRow] = await db
                .select({ fullName: people.fullName })
                .from(unitRoles)
                .innerJoin(people, eq(people.id, unitRoles.personId))
                .where(and(
                    eq(unitRoles.unitId,     row.unitId),
                    eq(unitRoles.tenantId,   tenant_id),
                    eq(unitRoles.isFeePayer, true),
                    lte(unitRoles.effectiveFrom, paidAtDate),
                    or(
                        isNull(unitRoles.effectiveTo),
                        gte(unitRoles.effectiveTo, paidAtDate),
                    ),
                ))
                .limit(1);

            const payerName = feePayerRow?.fullName ?? 'לא ידוע';

            // 4 & 5. Atomically claim the next receipt number AND persist the receipt
            // in one transaction — if the insert fails (unique violation), the
            // counter increment is rolled back too, so no gap is created.
            const receiptYear = row.paidAt.getFullYear();

            try {
                receipt = await db.transaction(async (tx) => {
                    const [counter] = await tx
                        .insert(receiptCounters)
                        .values({ tenantId: tenant_id, year: receiptYear, lastSeq: 1 })
                        .onConflictDoUpdate({
                            target: [receiptCounters.tenantId, receiptCounters.year],
                            set: { lastSeq: sql`${receiptCounters.lastSeq} + 1` },
                        })
                        .returning({ lastSeq: receiptCounters.lastSeq });

                    const [inserted] = await tx
                        .insert(paymentReceipts)
                        .values({
                            tenantId:      tenant_id,
                            paymentId,
                            receiptNumber: counter.lastSeq,
                            receiptYear,
                            payerName,
                        })
                        .returning();

                    return inserted;
                });
            } catch (insertErr: any) {
                // Race condition: another concurrent request won the transaction.
                // The rolled-back transaction left no counter gap — re-read the winner.
                const existing = await db
                    .select()
                    .from(paymentReceipts)
                    .where(eq(paymentReceipts.paymentId, paymentId))
                    .limit(1);
                if (!existing[0]) throw insertErr;
                receipt = existing[0];
            }
        }

        // 6. Format the receipt number as YYYY-NNNN
        const formattedNumber = `${receipt.receiptYear}-${String(receipt.receiptNumber).padStart(4, '0')}`;

        // 7. Render PDF
        // renderToBuffer expects React.ReactElement<DocumentProps> but ReceiptDocument
        // wraps Document internally, so we cast at the call site.
        const buffer = await renderToBuffer(
            React.createElement(ReceiptDocument, {
                receiptNumber:   formattedNumber,
                buildingName:    row.buildingName,
                buildingAddress: `${row.addressStreet}, ${row.addressCity}`,
                unitNumber:      row.unitNumber,
                payerName:       receipt.payerName,
                periodMonth:     row.periodMonth,
                amount:          row.amount,
                paymentMethod:   row.paymentMethod,
                paidAt:          row.paidAt,
                generatedAt:     new Date(),
            }) as Parameters<typeof renderToBuffer>[0]
        );

        // 8. Return PDF — convert Node Buffer to Uint8Array for NextResponse BodyInit
        return new NextResponse(new Uint8Array(buffer), {
            status: 200,
            headers: {
                'Content-Type':        'application/pdf',
                'Content-Disposition': `attachment; filename="receipt-${formattedNumber}.pdf"`,
                'Cache-Control':       'no-store',
            },
        });

    } catch (error: any) {
        console.error('Error generating receipt PDF:', error);
        captureApiError(error, req).catch(() => {});
        return NextResponse.json(
            { data: null, error: { message: error.message || 'Internal server error' }, meta: null },
            { status: 500 }
        );
    }
}
