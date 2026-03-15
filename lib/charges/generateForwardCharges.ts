import { sql } from 'drizzle-orm'

/**
 * Returns an array of `count` consecutive month strings in YYYY-MM-01 format,
 * starting from the month containing `from`.
 *
 * Pure function — no DB calls. Used for unit tests and as the canonical
 * source of truth for which months we generate charges for.
 *
 * Example: getForwardMonths(new Date('2026-03-15'), 3)
 *          → ['2026-03-01', '2026-04-01', '2026-05-01']
 */
export function getForwardMonths(from: Date, count = 12): string[] {
    const months: string[] = []
    const d = new Date(from.getFullYear(), from.getMonth(), 1)
    for (let i = 0; i < count; i++) {
        const yyyy = d.getFullYear()
        const mm = String(d.getMonth() + 1).padStart(2, '0')
        months.push(`${yyyy}-${mm}-01`)
        d.setMonth(d.getMonth() + 1)
    }
    return months
}

type Executor = { execute: (query: ReturnType<typeof sql>) => Promise<unknown> }

/**
 * Inserts charges for a single unit for 12 months starting from `fromDate`
 * (defaults to the current month). Uses a single SQL query with
 * generate_series — one round-trip per unit.
 *
 * Safe to call multiple times: ON CONFLICT (unit_id, period_month) DO NOTHING
 * means existing charges are never overwritten.
 *
 * @param dbOrTx  Drizzle db or transaction object
 * @param tenantId
 * @param unitId
 * @param fromDate  Start month (defaults to now). Day component is ignored.
 * @returns number of newly inserted charges
 */
export async function generateForwardCharges(
    dbOrTx: Executor,
    tenantId: string,
    unitId: string,
    fromDate: Date = new Date(),
): Promise<number> {
    // Normalize to first of month, format as YYYY-MM-01
    const fromStr = getForwardMonths(fromDate, 1)[0]

    const result = await dbOrTx.execute(sql`
        INSERT INTO charges (tenant_id, unit_id, period_month, amount_due, due_date, status)
        SELECT
            ${tenantId}::uuid,
            upc.unit_id,
            gs.month::date,
            upc.monthly_amount,
            (gs.month + ((upc.billing_day - 1) * interval '1 day'))::date,
            'pending'
        FROM unit_payment_config upc
        CROSS JOIN generate_series(
            ${fromStr}::date,
            (${fromStr}::date + interval '11 months')::date,
            interval '1 month'
        ) gs(month)
        WHERE upc.unit_id   = ${unitId}::uuid
          AND upc.tenant_id = ${tenantId}::uuid
          AND upc.billing_day IS NOT NULL
        ON CONFLICT (unit_id, period_month) DO NOTHING
        RETURNING id
    `)

    const rows = Array.isArray(result) ? result : (result as any).rows ?? []
    return rows.length
}
