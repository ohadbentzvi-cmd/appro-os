import { NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@apro/db';
import { chargeGenerationLog } from '@apro/db/src/schema';
import { sql, eq, and, desc } from 'drizzle-orm';
import * as Sentry from '@sentry/nextjs';
import { captureApiError } from '@/lib/api/sentry';

const generateChargesSchema = z.object({
    period_month: z.string().regex(/^\d{4}-\d{2}-01$/, "Must be YYYY-MM-01 format")
});

export async function POST(req: Request) {
    try {
        const authHeader = req.headers.get('x-generate-secret');
        const expectedSecret = process.env.CHARGE_GENERATION_SECRET;

        if (!authHeader || authHeader !== expectedSecret) {
            return NextResponse.json(
                { data: null, error: { message: 'Unauthorized' }, meta: null },
                { status: 401 }
            );
        }

        const body = await req.json();
        const parsed = generateChargesSchema.safeParse(body);

        if (!parsed.success) {
            return NextResponse.json(
                { data: null, error: { message: 'Invalid request body', details: parsed.error.issues }, meta: null },
                { status: 400 }
            );
        }

        const { period_month } = parsed.data;
        const tenant_id = process.env.APRO_TENANT_ID;

        if (!tenant_id) {
            console.error('APRO_TENANT_ID is missing from environment variables');
            return NextResponse.json(
                { data: null, error: { message: 'Internal server error' }, meta: null },
                { status: 500 }
            );
        }

        Sentry.addBreadcrumb({ category: 'finance', message: `Manual charge generation triggered for ${period_month}`, level: 'info' });

        // Call the raw Postgres function
        const result = await db.execute(
            sql`SELECT generate_charges_for_month(${period_month}::date, ${tenant_id}::uuid) AS count`
        );

        const countStr = (result as any)[0]?.count;
        const count = typeof countStr === 'number' ? countStr : parseInt(String(countStr || '0'), 10);

        // Update the log inserted by the postgres function to reflect manual trigger
        // The postgres function inserts with 'pg_cron', we update the most recent one to 'manual_api'
        const recentLogs = await db.select({ id: chargeGenerationLog.id })
            .from(chargeGenerationLog)
            .where(
                and(
                    eq(chargeGenerationLog.tenantId, tenant_id),
                    eq(chargeGenerationLog.periodMonth, period_month)
                )
            )
            .orderBy(desc(chargeGenerationLog.createdAt))
            .limit(1);

        if (recentLogs.length > 0) {
            await db.update(chargeGenerationLog)
                .set({ triggeredBy: 'manual_api' })
                .where(eq(chargeGenerationLog.id, recentLogs[0].id));
        }

        return NextResponse.json({
            data: {
                period_month,
                charges_created: count,
                triggered_by: 'manual_api'
            },
            error: null,
            meta: null
        });

    } catch (error: any) {
        console.error('Error generating charges:', error);
        await captureApiError(error);
        return NextResponse.json(
            { data: null, error: { message: error.message || 'Internal server error' }, meta: null },
            { status: 500 }
        );
    }
}
