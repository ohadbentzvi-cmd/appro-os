import { NextRequest } from 'next/server';
import { db } from '@apro/db';
import { sql } from 'drizzle-orm';
import { successResponse, errorResponse } from '@/lib/api/response';
import { getServerUser } from '@/lib/supabase/server';
import { z } from 'zod';

const schema = z.object({
    period_month: z.string().regex(/^\d{4}-\d{2}-01$/, 'Expected YYYY-MM-01'),
});

export async function POST(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id: buildingId } = await params;

        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
        if (!uuidRegex.test(buildingId)) return errorResponse('Invalid Building ID', 400);

        const { tenantId } = await getServerUser();
        if (!tenantId) return errorResponse('Unauthorized', 401);

        const body = await req.json();
        const parsed = schema.safeParse(body);
        if (!parsed.success) return errorResponse('Invalid request body', 400);

        const { period_month } = parsed.data;

        console.log('[gen-charges] START', { buildingId, tenantId, period_month });

        // Check units exist
        const unitsResult = await db.execute(sql`
            SELECT id FROM units
            WHERE building_id = ${buildingId}::uuid
              AND tenant_id = ${tenantId}::uuid
        `);
        const unitRows = Array.isArray(unitsResult) ? unitsResult : (unitsResult as any).rows ?? [];

        console.log('[gen-charges] units found:', unitRows.length);

        if (unitRows.length === 0) {
            console.log('[gen-charges] returning no_units');
            return successResponse({ charges_created: 0, reason: 'no_units' });
        }

        // Check payment configs exist (no date filter — just check if any config is set up at all)
        const anyConfigResult = await db.execute(sql`
            SELECT COUNT(*) AS cnt
            FROM unit_payment_config upc
            JOIN units u ON u.id = upc.unit_id
            WHERE u.building_id = ${buildingId}::uuid
              AND u.tenant_id = ${tenantId}::uuid
        `);
        const anyConfigRows = Array.isArray(anyConfigResult) ? anyConfigResult : (anyConfigResult as any).rows ?? [];
        const anyConfigCount = parseInt((anyConfigRows[0] as any)?.cnt ?? '0', 10);

        console.log('[gen-charges] total configs (any date):', anyConfigCount);

        if (anyConfigCount === 0) {
            console.log('[gen-charges] returning no_config');
            return successResponse({ charges_created: 0, reason: 'no_config' });
        }

        // Debug: show which configs match the target period's date range
        const matchingConfigResult = await db.execute(sql`
            SELECT u.id AS unit_id, u.unit_number, upc.monthly_amount,
                   upc.effective_from, upc.effective_until
            FROM unit_payment_config upc
            JOIN units u ON u.id = upc.unit_id
            WHERE u.building_id = ${buildingId}::uuid
              AND u.tenant_id = ${tenantId}::uuid
              AND upc.effective_from <= ${period_month}::date
              AND (upc.effective_until IS NULL OR upc.effective_until >= ${period_month}::date)
        `);
        const matchingConfigs = Array.isArray(matchingConfigResult)
            ? matchingConfigResult
            : (matchingConfigResult as any).rows ?? [];

        console.log('[gen-charges] configs matching date range for', period_month, ':', matchingConfigs.length, JSON.stringify(matchingConfigs));

        // Debug: show any existing charges for this period
        const existingResult = await db.execute(sql`
            SELECT c.unit_id, c.period_month
            FROM charges c
            JOIN units u ON u.id = c.unit_id
            WHERE u.building_id = ${buildingId}::uuid
              AND c.tenant_id = ${tenantId}::uuid
              AND c.period_month = ${period_month}::date
        `);
        const existingRows = Array.isArray(existingResult)
            ? existingResult
            : (existingResult as any).rows ?? [];

        console.log('[gen-charges] existing charges for this period:', existingRows.length);

        // Run the insert scoped to this building
        const insertResult = await db.execute(sql`
            INSERT INTO charges (tenant_id, unit_id, period_month, amount_due, due_date, status)
            SELECT
                ${tenantId}::uuid,
                u.id,
                ${period_month}::date,
                upc.monthly_amount,
                (date_trunc('month', ${period_month}::date) + interval '1 month' - interval '1 day')::date,
                'pending'
            FROM units u
            JOIN unit_payment_config upc
                ON upc.unit_id = u.id
               AND upc.tenant_id = ${tenantId}::uuid
               AND upc.effective_from <= ${period_month}::date
               AND (upc.effective_until IS NULL OR upc.effective_until >= ${period_month}::date)
            WHERE
                u.building_id = ${buildingId}::uuid
                AND u.tenant_id = ${tenantId}::uuid
                AND NOT EXISTS (
                    SELECT 1 FROM charges c
                    WHERE c.unit_id = u.id
                      AND c.period_month = ${period_month}::date
                      AND c.tenant_id = ${tenantId}::uuid
                )
            ON CONFLICT (unit_id, period_month) DO NOTHING
            RETURNING id
        `);

        const insertedRows = Array.isArray(insertResult) ? insertResult : (insertResult as any).rows ?? [];
        const charges_created = insertedRows.length;

        console.log('[gen-charges] insert result type:', Array.isArray(insertResult), 'rows:', charges_created);

        const reason = charges_created === 0 ? 'already_exists' : 'ok';

        console.log('[gen-charges] DONE', { charges_created, reason });

        return successResponse({ charges_created, reason, period_month });
    } catch (e: any) {
        console.error('[gen-charges] ERROR', e?.message, e?.stack);
        return errorResponse('Internal server error', 500);
    }
}
