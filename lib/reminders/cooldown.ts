const COOLDOWN_MS = 24 * 60 * 60 * 1000; // 24 hours

/**
 * Pure time-check: returns true if the given sentAt timestamp falls within
 * the 24-hour cooldown window relative to `nowMs`.
 * Testable without any DB dependency.
 */
export function isWithinCooldown(sentAt: string, nowMs: number = Date.now()): boolean {
    return nowMs - new Date(sentAt).getTime() < COOLDOWN_MS;
}

/**
 * Returns the set of person IDs currently blocked by the cooldown rule.
 * One DB query: all non-failed reminder_logs sent in the last 24 hours.
 * The result is used by the preview endpoint to flag blocked entries.
 */
export async function getBlockedPersonIds(
    db: import('drizzle-orm/postgres-js').PostgresJsDatabase,
    tenantId: string,
): Promise<Set<string>> {
    const { reminderLogs } = await import('@apro/db/src/schema');
    const { and, eq, gt, ne } = await import('drizzle-orm');

    const cutoff = new Date(Date.now() - COOLDOWN_MS).toISOString();

    const rows = await db
        .select({ personId: reminderLogs.recipientPersonId })
        .from(reminderLogs)
        .where(
            and(
                eq(reminderLogs.tenantId, tenantId),
                gt(reminderLogs.sentAt, new Date(cutoff)),
                ne(reminderLogs.status, 'failed'),
            )
        );

    const blocked = new Set<string>();
    for (const row of rows) {
        if (row.personId) blocked.add(row.personId);
    }
    return blocked;
}
