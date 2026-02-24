import { NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@apro/db';
import { sql } from 'drizzle-orm';

const generateChargesSchema = z.object({
    period_month: z.string().regex(/^\d{4}-\d{2}-01$/, "Must be YYYY-MM-01 format"),
    tenant_id: z.string().uuid()
});

export async function POST(req: Request) {
    try {
        // Authenticate via Supabase Service Role Key
        const authHeader = req.headers.get('authorization');
        const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

        if (!authHeader || !authHeader.startsWith('Bearer ') || authHeader.split(' ')[1] !== serviceRoleKey) {
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

        const { period_month, tenant_id } = parsed.data;

        // Call the raw Postgres function
        const result = await db.execute(
            sql`SELECT generate_charges_for_month(${period_month}::date, ${tenant_id}::uuid) AS count`
        );

        const count = result.rows[0]?.count ?? 0;

        return NextResponse.json({
            data: { inserted: count },
            error: null,
            meta: null
        });

    } catch (error: any) {
        console.error('Error generating charges:', error);
        return NextResponse.json(
            { data: null, error: { message: error.message || 'Internal server error' }, meta: null },
            { status: 500 }
        );
    }
}
